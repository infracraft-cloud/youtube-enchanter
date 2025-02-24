import { debug, browserColorLog, createStyledElement } from "@/src/utils/utilities";

import { CAST_TRANSCRIPT_PANEL_HTML, CAST_TRANSCRIPT_HEADER_HTML, CAST_TRANSCRIPT_BODY_HTML, DROPDOWN_MENU_HTML } from "./constants";
import { buildDropdownWithTextTrigger, enableDropdownListeners, disableDropdownListeners } from "./dropdown"
import { loadTranscriptSegments } from "./transcriptSegments";
import { displayTnotesByFilter, loadTranslation } from "./transcriptTranslation"
import { createElement, d_ws, listenAttributeMutation, listenAttributePressed, registerGlobalClickListener, waitSetInnerHTML } from "./utils";



export const loadCastTranscriptPanel = async () : Promise<HTMLElement> => {
	let ret = document.querySelector("#primary #below #panels ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (ret !== null && ret.getAttribute("status") !== "initializing") return ret;  // Already built, so just return it

        // Transcript panel hasn't been fully built yet, so build it from scratch	
	const panels = getPanelsContainer();
	const castTranscriptPanel = await buildCastTranscriptPanel(panels);

	return castTranscriptPanel;
}

export const setCastTranscriptPanelVisibility = (visible: boolean, castTranscriptPanel?: HTMLElement) => {
        if (!castTranscriptPanel) castTranscriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (!castTranscriptPanel) {
	     console.log("setCastTranscriptPanelVisibility() error: could not find castTranscriptPanel");
	     return;
	}

	if (visible) {
	     castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	} else {
	     castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN");
	}
}

const buildCastTranscriptPanel = async (panels: HTMLElement) => {
	const castTranscriptPanel = createElement(CAST_TRANSCRIPT_PANEL_HTML);
	panels.appendChild(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties

	if (d_ws) debug("[buildCastTranscriptPanel] building header");
	const castHeader = castTranscriptPanel.querySelector("#header");
	await waitSetInnerHTML(castHeader,  CAST_TRANSCRIPT_HEADER_HTML);
	if (d_ws) debug("[buildCastTranscriptPanel] building header initialized -- attaching listeners");
	await buildLanguageDropdown(castTranscriptPanel);
	await buildModeDropdown(castTranscriptPanel);
	
	// For some reason due to dynamic scripts, we must set the text content of the title after we have created all the elements,
	// otherwise the scripts would modify the title to become empty.
	castHeader.querySelector("#title-text").textContent = "Casted Transcript";
	attachHeaderListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building header done!");






	if (d_ws) debug("[buildCastTranscriptPanel] building content");
	const castContent = castTranscriptPanel.querySelector("#content");
	await waitSetInnerHTML(castContent, CAST_TRANSCRIPT_BODY_HTML);

	if (d_ws) debug("[buildCastTranscriptPanel] building content initialized -- attaching listeners");
	attachContentListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building content done!");

	castTranscriptPanel.setAttribute("status", "initialized");
	await loadTranscriptSegments(castTranscriptPanel);
	
	return castTranscriptPanel;
}

const buildLanguageDropdown = async (castTranscriptPanel: HTMLElement) => {
	const dropdownContainer = castTranscriptPanel.querySelector("#header #language-dropdown");
	if (!dropdownContainer) throw new Error("buildLanguageDropdown() error: cannot find dropdownContainer");
	
	const dropdownOptions = [{id: "en", text: "English", isInitiallySelected: false},
	                         {id: "es", text: "Spanish", isInitiallySelected: false},
	                         {id: "fr", text: "French", isInitiallySelected: false},
	                         {id: "zh-CN", text: "Mandarin", isInitiallySelected: false},
	                         {id: "hi", text: "Hindi", isInitiallySelected: false},
	                         {id: "ar", text: "Arabic", isInitiallySelected: false}];
				 
	const settings = {};
	return buildDropdownWithTextTrigger("Translate", dropdownOptions, dropdownContainer, settings, async (optionId, text) => {
	       await loadTranslation(castTranscriptPanel, optionId);
	       updatePanelMode();
	});
}

var panelMode = "show-translations";
const buildModeDropdown = async (castTranscriptPanel: HTMLElement) => {
	const dropdownContainer = castTranscriptPanel.querySelector("#header #mode-dropdown");
	if (!dropdownContainer) throw new Error("buildModeDropdown() error: cannot find dropdownContainer");
	
	const dropdownOptions = [{id: "show-translations", text: "Show Translations (ST)", triggerText: "Mode: ST", isInitiallySelected: true},
	                         {id: "click-to-show", text: "Click to Show (CTS)", triggerText: "Mode: CTS", isInitiallySelected: false},
	                         {id: "listening-multiple-choice", text: "Listening - Multiple Choice (LMC)", triggerText: "Mode: MC", isInitiallySelected: false},
	                         {id: "listening-fill-in-the-blank", text: "Listening - Fill In the Blank (LFB)", triggerText: "Mode: FIB", isInitiallySelected: false},
	                         {id: "writing-multiple-choice", text: "Writing - Multiple Choice (WMC)", triggerText: "Mode: MC", isInitiallySelected: false},
	                         {id: "writing-fill-in-the-blank", text: "Writing - Fill In the Blank (WFB)", triggerText: "Mode: FIB", isInitiallySelected: false}];
				 
	const settings = {setInitialTriggerTextAsInitialSelectedOption: true}
	return buildDropdownWithTextTrigger("Mode", dropdownOptions, dropdownContainer, settings, (optionId, text) => {
	       panelMode = optionId;
	       updatePanelMode();
	});
}

const updatePanelMode = () => {
        switch (panelMode) {
	      case "show-translations":
	           displayTnotesByFilter(null, [["0"]]);
	      	   break;
	      case "click-to-show":
	           displayTnotesByFilter([], []);
	      	   break;
	      case "listening-multiple-choice":
	      	   break;
	      case "listening-fill-in-the-blank":
	      	   break;
	      case "writing-multiple-choice":
	      	   break;
	      case "writing-fill-in-the-blank":
	      	   break;
	      default:
	           throw new Error(`updatePanelMode() error: unsupported panelMode=${panelMode}`);
	}
}

const attachHeaderListeners = (castTranscriptPanel: HTMLElement) => {
        const castHeader = castTranscriptPanel.querySelector("#header");
	if (!castHeader) throw new Error("attachHeaderListeners() error: cannot find castHeader");
	
	const closeButton = castHeader.querySelector("#visibility-button yt-button-shape");
	if (!closeButton) throw new Error("attachHeaderListeners() error: cannot find castHeader closeButton");
	
	registerGlobalClickListener([closeButton], (withinBoundaries) => {if (withinBoundaries) setCastTranscriptPanelVisibility(false, castTranscriptPanel);});


	const languageDropdown = castHeader.querySelector("#language-dropdown");
	if (!languageDropdown) throw new Error("attachHeaderListeners() error: cannot find languageDropdown");
	
	enableDropdownListeners(languageDropdown);
	
	const modeDropdown = castHeader.querySelector("#mode-dropdown");
	if (!modeDropdown) throw new Error("attachHeaderListeners() error: cannot find modeDropdown");
	
	enableDropdownListeners(modeDropdown);
}

const attachContentListeners = (castTranscriptPanel: HTMLElement) => {
        const castContent = castTranscriptPanel.querySelector("#content");
	if (!castContent) throw new Error("attachContentListeners() error: cannot find castContent");
	
        const segmentsContent = castContent.querySelector("#segments-container");
	if (!segmentsContent) throw new Error("attachContentListeners() error: cannot find segmentsContent");

	const languageDropdown = castTranscriptPanel.querySelector("#header #language-dropdown");
	if (!languageDropdown) throw new Error("attachContentListeners() error: cannot find languageDropdown");
	const languageDropdownTrigger = languageDropdown.querySelector("#trigger");
	if (!languageDropdownTrigger) throw new Error("attachContentListeners() error: cannot find languageDropdownTrigger");
	
	const modeDropdown = castTranscriptPanel.querySelector("#header #mode-dropdown");
	if (!modeDropdown) throw new Error("attachContentListeners() error: cannot find modeDropdown");
	const modeDropdownTrigger = modeDropdown.querySelector("#trigger");
	if (!modeDropdownTrigger) throw new Error("attachContentListeners() error: cannot find modeDropdownTrigger");
	
	listenAttributeMutation(segmentsContent, "status", (mutation, observer) => {
	    if (mutation.target.getAttribute("status") === "done") {
	        languageDropdown.style.display = "";
	        modeDropdown.style.display = "";	    
	    }
	});

	for (const languageModeDropdownTrigger of [languageDropdownTrigger, modeDropdownTrigger]) {
	    listenAttributeMutation(languageModeDropdownTrigger, "option-id", (mutation, observer) => {
		const languageId = languageDropdownTrigger.getAttribute("option-id");
		const modeId = modeDropdownTrigger.getAttribute("option-id");

		if (languageId && modeId) {
		
		}
	    });
	}
}

const getPanelsContainer = () : HTMLEelement => {
	let panels = document.querySelector("#primary #below #panels");
	if (!panels) {
	    let below = document.querySelector("#primary #below");
	    if (!below) {
		    throw new Error("Could not find document.querySelector('#primary #below') in the web page, which is the required container for castTranscriptPanel!");
	    }

	    panels = createStyledElement({
		   classlist: ["style-scope", "ytd-watch-flexy"],
		   elementId: "panels",
		   elementType: "div"
	    });

	    below.prepend(panels);
	}

	return panels;
}
