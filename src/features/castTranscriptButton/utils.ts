import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { trustedPolicy } from "@/src/pages/embedded";
import { selectWithLog, createStyledElement } from "@/src/utils/utilities";

/*
// How to add trustedpolicies. ref: https://stackoverflow.com/questions/78237946/how-to-fix-trustedhtml-assignement-error-with-vuejs
if (typeof window.trustedTypes == 'undefined') window.trustedTypes = {createPolicy: (n, rules) => rules};

export const trustedPolicy = trustedTypes.createPolicy('youtube-enchanter', {
  createHTML: (string, sink) => {
    return string;
  }
});

rootElement.innerHTML = policy.createHTML("...");

// Caption notes
// ref: https://stackoverflow.com/questions/32142656/get-youtube-captions


// How to call url
// const response = await fetch(`http://localhost:8001/api/v1/stt/navigate/youtube?api-key=aaa&url=${window.location.href}`, {
//	headers: { Test: "test" },
//  	method: "get"
//});
// const data = await response.text();
// const json = JSON.parse(data);
*/


const loadCastTranscriptPanel = async () => {
	let ret = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (ret === null || ret.getAttribute("status") !== "done") {
	    // Cast Transcript panel hasn't been built yet, so build it

	    // First, load the (regular) transcript panel, so that we can copy its style and structure
            const transcriptPanel = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]", false, "loadCastTranscriptPanel() error: could not find OpenTranscript panel");
	    if (transcriptPanel === null) {
		    return null;
	    }
	    
	    const loadTranscript = (transcriptPanel !== null) && (transcriptPanel.querySelector("ytd-transcript-renderer ytd-transcript-search-panel-renderer ytd-transcript-segment-list-renderer") === null);
	    let prevVisibility = "";
	    if (loadTranscript) {
		  // Make transcript panel hidden so the viewer can't see this quick load/unload behavior
		  prevVisibility = transcriptPanel.style.display;
		  transcriptPanel.style.visibility = "hidden";
		  
        	  const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
		  if (transcriptButton) transcriptButton.click();
		  
		  await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]",
					    "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-engagement-panel-title-header-renderer",
					    "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer",
					    "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer",
					    "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer ytd-transcript-segment-list-renderer"]);
	    }


	    // While we have the transcript panel up, build the cast transcript panel by copying its structure
	    try {
	    	ret = await buildCastTranscriptPanel();
	    } finally {
		if (loadTranscript) {
		      // Close the transcript panel. Remember to revert its visibility
		      const closeTranscript = document.querySelector('button[aria-label="Close transcript"]')
		      if (closeTranscript) closeTranscript.click();
		      transcriptPanel.style.visibility = prevVisibility;
		}
	    }


	    // Now that the cast transcript panel is built, fill up the content
	    ret.setAttribute("status", "processing");
	    const castTranscriptSegments = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript] ytd-transcript-segment-list-renderer", false, "loadCastTranscriptPanel() error: could not find CastTranscript segment list");
	    await populateTranscript(castTranscriptSegments);
	    ret.setAttribute("status", "done");
	}
	return ret;
}

const buildCastTranscriptPanel = async () => {
	// Create cast transcript panel
	const transcriptPanel = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]", true, "buildCastTranscriptPanel() error: could not find OpenTranscript panel");
	const castTranscriptPanel = transcriptPanel.cloneNode(true);
	transcriptPanel.after(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties
	castTranscriptPanel.setAttribute("target-id", "engagement-panel-cast-transcript");
	castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	castTranscriptPanel.setAttribute("status", "initializing");
	castTranscriptPanel.style.visibility = "";

	// Create cast transcript panel's title
	const transcriptTitle = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-engagement-panel-title-header-renderer", true, "buildCastTranscriptPanel() error: could not find OpenTranscript title");
	const castTranscriptTitle = transcriptTitle.cloneNode(true);
	castTranscriptPanel.children[0].appendChild(castTranscriptTitle);  // NOTE: node has to be added first before we can modify its properties
	castTranscriptTitle.querySelector("#title-text").textContent = "Casted Transcript";
	castTranscriptTitle.querySelector("#icon").style.width = "0px";


	// Create cast transcript panel's content
	const transcriptContent = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer", true, "buildCastTranscriptPanel() error: could not find OpenTranscript content");
	const castTranscriptContent = transcriptContent.cloneNode(true);
	castTranscriptPanel.children[1].appendChild(castTranscriptContent);  // NOTE: node has to be added first before we can modify its properties

	const transcriptBody = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer", true, "buildCastTranscriptPanel() error: could not find OpenTranscript search panel");
	const castTranscriptBody = transcriptBody.cloneNode(true);
	castTranscriptContent.children[1].appendChild(castTranscriptBody);  // NOTE: node has to be added first before we can modify its properties

	const transcriptSegments = await selectWithLog("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-segment-list-renderer", true, "buildCastTranscriptPanel() error: could not find OpenTranscript segment list");
	const castTranscriptSegments = transcriptSegments.cloneNode(true);
	castTranscriptBody.children[1].appendChild(castTranscriptSegments);  // NOTE: node has to be added first before we can modify its properties

	castTranscriptPanel.setAttribute("status", "initialized");	
	return castTranscriptPanel;
}

const populateTranscript = async (transcriptSegments: HTMLElement) => {
	const segmentsContainer = transcriptSegments.querySelector("#segments-container");
	setSegments(segmentsContainer, null);

	const response = await fetch(`http://localhost:8001/api/v1/stt/navigate/youtube?api-key=aaa&url=${window.location.href}`, {
	       headers: { Test: "test" },
	       method: "get"
	});
	const text_response = await response.text();
	const json_response = JSON.parse(text_response);
	setSegments(segmentsContainer, json_response);
}


const setSegments = (segmentsContainer: HTMLElement, json_response) => {
       let segmentsHTML = "";

       if (json_response !== null) {
	   for (let i = 0; i < json_response.transcription.chunks.length; i++) {
		 const chunk = json_response.transcription.chunks[i];
		 segmentsHTML += buildSegmentHTML(chunk.text, chunk.timestamp[0], chunk.timestamp[1]);
	   }
       } else {
           segmentsHTML = buildSegmentHTML("Loading...", -1, -1);
       }
       
       segmentsContainer.innerHTML = trustedPolicy.createHTML(segmentsHTML);
       
       const segments = segmentsContainer.querySelectorAll("div[caption]");
       for (let i = 0; i < segments.length; i++) {
	   const segment = segments[i];
	   const segmentCaption = segment.querySelector("yt-formatted-string");
	   if (segmentCaption.hasAttribute("is-empty")) {
	       segmentCaption.removeAttribute("is-empty");
	       segmentCaption.textContent = segment.getAttribute("caption");
	   }
       }
}

const buildSegmentHTML = (caption: string, start_timestamp_s: number, end_timestamp_s: number) => {      
	const start_hour = Math.floor(start_timestamp_s / 3600);
	const start_min = Math.floor((start_timestamp_s % 3600) / 60);
	const start_sec = Math.floor(start_timestamp_s % 60);

	let start_str_words = "";
	let start_str_digits = "";
	if (start_timestamp_s >= 0) {
	      if (start_timestamp_s > 0) {
		  if (start_hour > 0) {
		     start_str_words += `${start_hour} hour`;
		     if (start_hour > 1) {
			start_str_words += "s";
		     }
		  }
		  if (start_min > 0) {
		     if (start_str_words.length > 0) {
			start_str_words += ", ";
		     }

		     start_str_words += `${start_min} minute`;
		     if (start_min > 1) {
			start_str_words += "s";
		     }
		  }
		  if (start_sec > 0) {
		     if (start_str_words.length > 0) {
			start_str_words += ", ";
		     }

		     start_str_words += `${start_sec} second`;
		     if (start_sec > 1) {
			start_str_words += "s";
		     }
		  }
	      } else {
		  start_str_words = "0 seconds";
	      }

	      start_str_digits = `${start_sec.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})}`;
	      if (start_min > 0 || start_hour > 0) {
		   start_str_digits = `${start_min}:` + start_str_digits;
	      } else {
		   start_str_digits = "0:" + start_str_digits;
	      }
	      if (start_hour > 0) {
		   start_str_digits = `${start_hour}:` + start_str_digits;
	      }
	}

	return `<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${caption}" caption="${caption}"><div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true"><div class="segment-timestamp style-scope ytd-transcript-segment-renderer">${start_str_digits}</div></div><dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if><yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">${caption}</yt-formatted-string><dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>\n</div>`;
}

const castTranscriptAction = async () => {


	const castTranscriptPanel = await loadCastTranscriptPanel();
        castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	
	
	
	/*
	let transcript_content = transcript_panel.querySelector("ytd-transcript-renderer");
	let cast_transcript_content = transcript_content.cloneNode(true);
	cast_transcript_content.setAttribute("panel-target-id", "engagement-panel-casted-transcript");
	cast_transcript_content.id = "casted-transcript-content";
	cast_transcript_panel.children[1].appendChild(cast_transcript_content);
	*/

	let castedTranscriptButton = document.querySelector("#above-the-fold #title");
	castedTranscriptButton.textContent = "test0";
	let test = createStyledElement({
		 elementType: "div"
	});
	test.textContent = "test1";
	castedTranscriptButton.appendChild(test);
}

export const addCastTranscriptButton: AddButtonFunction = async () => {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: {
				button_placements: { castTranscriptButton: castTranscriptButtonPlacement }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	function castTranscriptButtonClickerListener() {
		 castTranscriptAction();
	}
	await addFeatureButton(
		"castTranscriptButton",
		castTranscriptButtonPlacement,
		window.i18nextInstance.t("pages.content.features.castTranscriptButton.button.label"),
		getFeatureIcon("castTranscriptButton", castTranscriptButtonPlacement),
		castTranscriptButtonClickerListener,
		false
	);
};

export const removeCastTranscriptButton: RemoveButtonFunction = async (placement) => {
	await removeFeatureButton("castTranscriptButton", placement);
	eventManager.removeEventListeners("castTranscriptButton");
};
