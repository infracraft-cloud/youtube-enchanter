import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { trustedPolicy } from "@/src/pages/embedded";
import { createStyledElement } from "@/src/utils/utilities";

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
*/

const buildSegment = (caption: string, start_timestamp_s: number, end_timestamp_s: number) => {
      const start_hour = Math.floor(start_timestamp_s / 3600);
      const start_min = Math.floor((start_timestamp_s % 3600) / 60);
      const start_sec = start_timestamp_s % 60;

      let start_str_words = "";
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

      let start_str_digits = `${start_sec.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})}`;
      if (start_min > 0 || start_hour > 0) {
      	 start_str_digits = `${start_min}:` + start_str_digits;
      } else {
         start_str_digits = "0:" + start_str_digits;
      }
      if (start_hour > 0) {
      	 start_str_digits = `${start_hour}:` + start_str_digits;
      }
      
      return `<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${caption}" caption="${caption}"><div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true"><div class="segment-timestamp style-scope ytd-transcript-segment-renderer">${start_str_digits}</div></div><dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if><yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">${caption}</yt-formatted-string><dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>\n</div>`;
}

const loadCastTranscriptPanel = async () => {
	const transcriptRenderer = document.querySelector("ytd-transcript-renderer");
	if (transcriptRenderer !== null) {
	      // Transcipt panel already loaded
	      return null;
	}

	let ret = null;
	
	// Transcript panel not dynamically loaded yet, so load it
	const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
	if (transcriptButton) {
	      // Make transcript panel hidden so the viewer can't see this quick load/unload behavior
              const transcriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]");
	      
	      const prevDisplay = transcriptPanel.style.visibility;
	      transcriptPanel.style.visibility = "hidden";
	      transcriptButton.click();

	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]",
					"ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-engagement-panel-title-header-renderer",
					"ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer",
					"ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer",
					"ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer ytd-transcript-segment-list-renderer"]);

	      // While we have the transcript panel up, build the cast transcript panel by copying its structure
	      ret = await buildCastTranscriptPanel();
	      ret.style.visibility = prevDisplay;  // ret is stylistically a copy of transcriptPanel, which we temporary made hidden, so here we revert the visibility

	      // Close the transcript panel. Remember to revert its visibility
	      const closeTranscript = document.querySelector('button[aria-label="Close transcript"]')
	      if (closeTranscript) closeTranscript.click();
              transcriptPanel.style.visibility = prevDisplay;
	}
	return ret;
}

const buildCastTranscriptPanel = async () => {
        // Create the cast transcript panel if it does not yet exist
	let castTranscriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (castTranscriptPanel === null || true) {					
	      // Create cast transcript panel
	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]"]);
	      const transcriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]");
	      castTranscriptPanel = transcriptPanel.cloneNode(true);
	      transcriptPanel.after(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties
	      castTranscriptPanel.setAttribute("target-id", "engagement-panel-cast-transcript");

	      // Create cast transcript panel's title
	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-engagement-panel-title-header-renderer"]);
	      const transcriptTitle = transcriptPanel.querySelector("ytd-engagement-panel-title-header-renderer");
	      const castTranscriptTitle = transcriptTitle.cloneNode(true);
	      castTranscriptPanel.children[0].appendChild(castTranscriptTitle);  // NOTE: node has to be added first before we can modify its properties
	      castTranscriptTitle.querySelector("#title-text").textContent = "Casted Transcript";
	      castTranscriptTitle.querySelector("#icon").style.width = "0px";


	      // Create cast transcript panel's content
	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer"]);
	      const transcriptContent = transcriptPanel.querySelector("ytd-transcript-renderer");
	      const castTranscriptContent = transcriptContent.cloneNode(true);
	      castTranscriptPanel.children[1].appendChild(castTranscriptContent);  // NOTE: node has to be added first before we can modify its properties
	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-search-panel-renderer"]);
	      const transcriptBody = transcriptContent.querySelector("ytd-transcript-search-panel-renderer");
	      const castTranscriptBody = transcriptBody.cloneNode(true);
	      castTranscriptContent.children[1].appendChild(castTranscriptBody);  // NOTE: node has to be added first before we can modify its properties
	      await waitForAllElements(["ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript] ytd-transcript-renderer ytd-transcript-segment-list-renderer"]);
	      const transcriptSegments = transcriptBody.querySelector("ytd-transcript-segment-list-renderer");
	      const castTranscriptSegments = transcriptSegments.cloneNode(true);
	      castTranscriptBody.children[1].appendChild(castTranscriptSegments);  // NOTE: node has to be added first before we can modify its properties

	      populateTranscript(castTranscriptSegments);
	}
	
	return castTranscriptPanel;
}

const populateTranscript = (transcriptSegments: HTMLElement) => {
      let segmentsHTML = ""
      segmentsHTML += buildSegment("test1", 0, 10);
      segmentsHTML += buildSegment("test2", 10, 20);
      segmentsHTML += buildSegment("test3", 20, 30);
      
      const segmentsContainer = transcriptSegments.querySelector("#segments-container");
      segmentsContainer.innerHTML = trustedPolicy.createHTML(segmentsHTML);

      const segments = segmentsContainer.querySelectorAll("div[caption]");
      for (let i = 0; i < segments.length; i++) {
      	  const segment = segments[i];
	  const segmentCaption = segment.querySelector("yt-formatted-string");
	  segmentCaption.removeAttribute("is-empty");
	  segmentCaption.textContent = segment.getAttribute("caption");
      }
}

const castTranscriptAction = async () => {
        /*
	const response = await fetch("ipecho.net/plain", {
		headers: { Test: "test" },
		method: "get"
	});
	const data = await response.text();
	// const json = JSON.parse(data);
	*/


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
