import { debug, browserColorLog, createStyledElement } from "@/src/utils/utilities";

import { CAST_TRANSCRIPT_PANEL_HTML, CAST_TRANSCRIPT_HEADER_HTML, CAST_TRANSCRIPT_BODY_HTML, DROPDOWN_MENU_HTML } from "./constants";
import { buildDropdownWithTextTrigger, enableDropdownListeners, disableDropdownListeners } from "./dropdown"
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
	await waitSetInnerHTML(castContent, CAST_TRANSCRIPT_BODY_HTML);

	const languageDropdownContainer = castContent.querySelector("#footer #menu");
	const options = [{id: "test1", text: "Original2", isInitiallySelected: false}, {id:"test2", text: "test2", isInitiallySelected: true}];
	const settings = {disableHighlightingSelectedOption: true};
	await buildDropdownWithTextTrigger("triggerText", options, languageDropdownContainer, settings);
	
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
	const languageDropdownContainer = castContent.querySelector("#footer #menu");
	enableDropdownListeners(languageDropdownContainer);
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
