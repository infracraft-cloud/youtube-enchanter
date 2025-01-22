import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { id_2_waitSelectMetadata, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { browserColorLog, createStyledElement, waitSelect } from "@/src/utils/utilities";
import { trustedPolicy} from "@/src/pages/embedded";

/*
// How to add trustedpolicies. ref: https://stackoverflow.com/questions/78237946/how-to-fix-trustedhtml-assignement-error-with-vuejs
if (typeof window.trustedTypes == 'undefined') window.trustedTypes = {createPolicy: (n, rules) => rules};

export const trustedPolicy = trustedTypes.createPolicy('youtube-enchanter', {
  createHTML: (string, sink) => {
    return string;
  }
});

rootElement.innerHTML = policy.createHTML("...");


// Kevin's notes: read this for more info on javascript: https://stackoverflow.com/a/47227878  (async and job queue)
// ref: https://stackoverflow.com/a/40880620  (event loop)

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
	if (ret === null || ret.getAttribute("status") === "initializing") {
	    // Cast Transcript panel hasn't been fully built yet, so build it from scratch

	    // First, load the (regular) transcript panel, so that we can copy its style and structure
	    let transcriptPanel = null;
	    let loadTranscript = null;
	    let prevVisibility = null;
	    return waitSelect(document, "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]").then((transcriptPanelMetadata) => {
	          transcriptPanel = transcriptPanelMetadata.result;

		  // If the OpenTranscript panel has not been fully loaded yet (by checking the segments content), load it
		  loadTranscript = (transcriptPanel.querySelector("ytd-transcript-renderer ytd-transcript-search-panel-renderer ytd-transcript-segment-list-renderer") === null);
		  prevVisibility = "";
		  
		  if (loadTranscript) {
			// Make transcript panel hidden so the viewer can't see this quick load/unload behavior
			prevVisibility = transcriptPanel.style.display;
			transcriptPanel.style.visibility = "hidden";

			const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
			if (transcriptButton) transcriptButton.click();
		  }


		  // While we have the transcript panel up, build the cast transcript panel by copying its structure
		  return buildCastTranscriptPanel(transcriptPanel);
	    }).then((castTranscriptPanel) => {
		  if (loadTranscript) {
			// Close the transcript panel. Remember to revert its visibility
			const closeTranscript = document.querySelector('button[aria-label="Close transcript"]')
			if (closeTranscript) closeTranscript.click();
			transcriptPanel.style.visibility = prevVisibility;
		  }

		  const castTranscriptSegments = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer #segments-container");
		  if (castTranscriptSegments) populateCastTranscript(castTranscriptSegments).then(() => {
		     castTranscriptPanel.setAttribute("status", "done");
		  });

		  return castTranscriptPanel;
	    });
	}
	
        return ret;
}

const buildCastTranscriptPanel = async (transcriptPanel: HTMLElement) => {
	// Create cast transcript panel
	const castTranscriptPanel = transcriptPanel.cloneNode(true);
	transcriptPanel.after(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties
	castTranscriptPanel.setAttribute("target-id", "engagement-panel-cast-transcript");
	castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	castTranscriptPanel.setAttribute("status", "initializing");
	castTranscriptPanel.style.visibility = "";
	castTranscriptPanel.style.order = "-5";


	let castTranscriptTitle = null;
	const titleBuilder = waitSelect(transcriptPanel, "ytd-engagement-panel-title-header-renderer").then((titleMetadata) => {
	      const transcriptTitle = titleMetadata.result;
	      castTranscriptTitle = transcriptTitle.cloneNode(true);
	      castTranscriptPanel.children[0].appendChild(castTranscriptTitle);  // NOTE: node has to be added first before we can modify its properties
	      castTranscriptTitle.querySelector("#title-text").textContent = "Casted Transcript";
	      castTranscriptTitle.querySelector("#icon").style.width = "0px";

	      return waitSelect(transcriptTitle, "#visibility-button ytd-button-renderer");
	}).then((titleCloseButtonMetadata) => {
	      const transcriptTitleCloseButton = titleCloseButtonMetadata.result;
	      const castTranscriptTitleCloseButton = transcriptTitleCloseButton.cloneNode(true);
	      castTranscriptTitle.children[2].children[6].appendChild(castTranscriptTitleCloseButton);  // NOTE: node has to be added first before we can modify its properties
	});

	let castTranscriptContent = null;
	let castTranscriptBody = null;
	const contentBuilder = waitSelect(transcriptPanel, "ytd-transcript-renderer").then((contentMetadata) => {
	      const transcriptContent = contentMetadata.result;
	      castTranscriptContent = transcriptContent.cloneNode(true);
	      castTranscriptPanel.children[1].appendChild(castTranscriptContent);  // NOTE: node has to be added first before we can modify its properties

	      return waitSelect(transcriptContent, "ytd-transcript-search-panel-renderer");
	}).then((transcriptBodyMetadata) => {
	      const transcriptBody = transcriptBodyMetadata.result;
	      castTranscriptBody = transcriptBody.cloneNode(true);
	      castTranscriptContent.children[1].appendChild(castTranscriptBody);  // NOTE: node has to be added first before we can modify its properties

	      return waitSelect(transcriptBody, "ytd-transcript-segment-list-renderer");
	}).then((transcriptSegmentsMetadata) => {
	      const transcriptSegments = transcriptSegmentsMetadata.result;
	      const castTranscriptSegments = transcriptSegments.cloneNode(true);
	      castTranscriptBody.children[1].appendChild(castTranscriptSegments);  // NOTE: node has to be added first before we can modify its properties
	});

	await titleBuilder;
	await contentBuilder;
	
	castTranscriptPanel.setAttribute("status", "initialized");
	return castTranscriptPanel;
}

const populateCastTranscript = (segmentsContainer: HTMLElement) => {
	setSegments(segmentsContainer, [{text: "Loading...", timestamp: [-1, -1]}]);

	return fetch(`http://localhost:8001/api/v1/stt/navigate/youtube?api-key=aaa&url=${window.location.href}`, {
	       headers: { Test: "test" },
	       method: "get"
	}).then((response) => {
	       if (response.status == 200) {
		      return response.json();
	       } else {
	              throw new Error(`populateTranscript(): fetch() returned an error with status ${response.status}: ${response.statusText}`);
	       }
	}).then((responseJson) => {
	       setSegments(segmentsContainer, responseJson.transcription.chunks);
	}).catch((error) => {
	       let publicErrorMsg = error.message;
	       let debugErrorMsg = error.message;
	       if (error.message.includes("Failed to fetch")) {
	       	     publicErrorMsg = "Failed to make network connection.";
	       	     debugErrorMsg = "populateTranscript() error: failed to make network connection. Please double check your internet connections, or if the servers are up.";
	       }
	       browserColorLog(`${debugErrorMsg}: ${error}`, "FgRed");
	       setSegments(segmentsContainer, [{text: `Network request error: ${publicErrorMsg}`, timestamp: [-1, -1]}]);
	});
}


const setSegments = (segmentsContainer: HTMLElement, segmentJsons) => {
       let segmentsHTML = "";

       for (let i = 0; i < segmentJsons.length; i++) {
	     const chunk = segmentJsons[i];
	     segmentsHTML += buildSegmentHTML(chunk.text, chunk.timestamp[0], chunk.timestamp[1]);
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

export const castTranscriptButtonClickerListener = () => {
	Object.keys(id_2_waitSelectMetadata).forEach((id) => Object.keys(id_2_waitSelectMetadata[id]).forEach((prop) => console.log(`${prop} => ${id_2_waitSelectMetadata[id][prop]}`)));
        loadCastTranscriptPanel().then(castTranscriptPanel => castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"));
	console.log("waitSelectMetadata:");
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
