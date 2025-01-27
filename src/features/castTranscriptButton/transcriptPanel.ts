import { debug, browserColorLog, createStyledElement } from "@/src/utils/utilities";

import { CAST_TRANSCRIPT_PANEL_HTML, CAST_TRANSCRIPT_HEADER_HTML, CAST_TRANSCRIPT_BODY_HTML } from "./constants";
import { loadTranscriptSegments} from "./transcriptSegments";
import { createElement, d_ws, listenAttributePressed, registerGlobalClickListener, waitSetInnerHTML } from "./utils";



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
	// For some reason due to dynamic scripts, we must set the text content of the title after we have created all the elements,
	// otherwise the scripts would modify the title to become empty.
	if (d_ws) debug("[buildCastTranscriptPanel] building header initialized -- attaching listeners");
	castHeader.querySelector("#title-text").textContent = "Casted Transcript";
	attachHeaderListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building header done!");


	if (d_ws) debug("[buildCastTranscriptPanel] building content");
	const castContent = castTranscriptPanel.querySelector("#content");
	await waitSetInnerHTML(castContent,  CAST_TRANSCRIPT_BODY_HTML);
	if (d_ws) debug("[buildCastTranscriptPanel] building content initialized -- attaching listeners");
	attachContentListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building content done!");

	castTranscriptPanel.setAttribute("status", "initialized");
	await loadTranscriptSegments(castTranscriptPanel);
	
	return castTranscriptPanel;
}

const attachHeaderListeners = (castTranscriptPanel: HTMLElement) => {
        const castHeader = castTranscriptPanel.querySelector("#header");
	if (!castHeader) throw new Error("attachHeaderListeners() error: cannot find castHeader");
	
	const closeButton = castHeader.querySelector("#visibility-button yt-button-shape");
	if (!closeButton) throw new Error("attachHeaderListeners() error: cannot find castHeader closeButton");
	
	registerGlobalClickListener([closeButton], (withinBoundaries) => {if (withinBoundaries) setCastTranscriptPanelVisibility(false, castTranscriptPanel);});
}

const attachContentListeners = (castTranscriptPanel: HTMLElement) => {
        const castContent = castTranscriptPanel.querySelector("#content");
	if (!castContent) throw new Error("attachContentListeners() error: cannot find castContent");
	
	// Language dropdown menu

	const languageDropdown = castContent.querySelector("#footer #menu tp-yt-paper-menu-button");
	if (!languageDropdown) throw new Error("attachContentListeners() error: cannot find castContent languageDropdown");
	const languageDropdownList = languageDropdown.querySelector("tp-yt-iron-dropdown#dropdown");
	if (!languageDropdownList) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownList");
	const languageDropdownTrigger = languageDropdown.querySelector("tp-yt-paper-button#label");
	if (!languageDropdownTrigger) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownTrigger");
	const languageDropdownOptions = languageDropdown.querySelectorAll("#dropdown tp-yt-paper-item[role=option]");
	if (!languageDropdownOptions) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownOptions");
	
	for (const languageDropdownOption of languageDropdownOptions) {
	    listenAttributePressed(languageDropdownOption, (mutation) => {
		 for (const curr of languageDropdownOptions) {
		     if (curr.isSameNode(mutation.target)) {
			   curr.parentNode.classList.add("iron-selected");
			   const optionText = curr.querySelector("#item-with-badge").textContent.trim();
			   
			   const triggerText = languageDropdownTrigger.querySelector("#label-text");
			   if (triggerText) {
			         triggerText.textContent = optionText;
			   } else {
			         browserColorLog("languageDropdownOption.pressed() error: cannot find triggerText, unable to update the text of languageDropdownTrigger!", "FgRed");
			   }
		     } else {
			   curr.parentNode.classList.remove("iron-selected");
		     }
		 }
		 setLanguageDropdownListVisibility(false, languageDropdownList);
	    });
	}

	registerGlobalClickListener([languageDropdownTrigger, languageDropdownList], (withinBoundaries) => {if (!withinBoundaries) setLanguageDropdownListVisibility(false, languageDropdownList);});
	listenAttributePressed(languageDropdownTrigger, (mutation) => {setLanguageDropdownListVisibility(true, languageDropdownList);});
}

const setLanguageDropdownListVisibility = (visible: boolean, languageDropdownList?: HTMLElement) => {
        if (!languageDropdownList) languageDropdownList = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript] #footer #menu tp-yt-iron-dropdown#dropdown");
	if (!languageDropdownList) {
	     console.log("setLanguageDropdownListVisibility() error: could not find languageDropdownList");
	     return;
	}

	const activeOption = languageDropdownList.querySelector("a[class~=iron-selected] tp-yt-paper-item");
	const parentRect = languageDropdownList.parentNode.getBoundingClientRect();
	 
	if (visible) {
	     languageDropdownList.style = `outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202;`;
	     languageDropdownList.removeAttribute("aria-hidden");
	     activeOption ? activeOption.focus() : languageDropdownList.focus();

	     // Now that the dropdown has been rendered, we know its width/height, so check if it is spilling out of the viewport. If so, reposition it back in the viewport
	     const rect = languageDropdownList.getBoundingClientRect();
	     const adjustX = Math.min(0, window.innerWidth - (rect.right + 20));
	     const adjustY = Math.min(0, window.innerHeight - (rect.bottom + 20));
	     languageDropdownList.style = `outline: none; position: fixed; left: ${parentRect.left + adjustX}px; top: ${parentRect.top + adjustY}px; z-index: 2202;`;
	} else {
	     languageDropdownList.style = "outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202; display: none;";
	     languageDropdownList.setAttribute("aria-hidden", "true");
	     activeOption ? activeOption.blur() : languageDropdownList.blur();
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
