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

const loadTranscriptPanel = async () => {
	const transcriptRenderer = document.querySelector("ytd-transcript-renderer");
	if (transcriptRenderer !== null) {
	      // Transcipt panel already loaded
	      return;
	}

	// Transcript panel not dynamically loaded yet, so load it
	const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
	if (transcriptButton) {
	      // Make transcript panel hidden so the viewer can't see this quick load/unload behavior
              const transcriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]");
	      const prevDisplay = transcriptPanel.style.visibility;
	      
	      transcriptPanel.style.visibility = "hidden";
	      transcriptButton.click();

	      await waitForAllElements(["ytd-transcript-renderer"]);

	      const closeTranscript = document.querySelector('button[aria-label="Close transcript"]')
	      if (closeTranscript) closeTranscript.click();
	      
              transcriptPanel.style.visibility = prevDisplay;
	}
}

const getCastTranscriptPanel = () => {
        // Create the cast transcript panel if it does not yet exist
	let castTranscriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (castTranscriptPanel === null) {
	      const transcriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]");
	      castTranscriptPanel = transcriptPanel.cloneNode(true);
	      castTranscriptPanel.setAttribute("target-id", "engagement-panel-cast-transcript");
	      castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	      transcriptPanel.after(castTranscriptPanel);
	}
	
	return castTranscriptPanel;
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


	await loadTranscriptPanel();
	const castTranscriptPanel = getCastTranscriptPanel();
        castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	
	
	/*
	let transcript_title = transcript_panel.querySelector("ytd-engagement-panel-title-header-renderer");
	let cast_transcript_title = transcript_title.cloneNode(true);
	cast_transcript_panel.children[0].appendChild(cast_transcript_title);
	
	let transcript_title = transcript_panel.querySelector("ytd-engagement-panel-title-header-renderer");
	let cast_transcript_title = transcript_title.cloneNode(false);
	cast_transcript_title.appendChild(transcript_title.querySelector("#header").cloneNode(false));
	cast_transcript_title.children[0].appendChild(transcript_title.querySelector("#title-container").cloneNode(true));
	cast_transcript_title.children[0].appendChild(transcript_title.querySelector("#menu").cloneNode(true));
	cast_transcript_title.children[0].appendChild(transcript_title.querySelector("#visibility-button").cloneNode(true));
	cast_transcript_panel.children[0].appendChild(cast_transcript_title);
	*/

	castTranscriptPanel.children[0].innerHTML = trustedPolicy.createHTML('<ytd-engagement-panel-title-header-renderer class="style-scope ytd-engagement-panel-section-list-renderer" enable-anchored-panel modern-panels><div id="header" class="style-scope ytd-engagement-panel-title-header-renderer"><div id="title-container" class="style-scope ytd-engagement-panel-title-header-renderer"><h2 id="title" class="style-scope ytd-engagement-panel-title-header-renderer" aria-label="CastedTranscript" tabindex="-1"><ytd-formatted-string id="title-text" ellipsis-truncate class="style-scope ytd-engagement-panel-title-header-renderer" ellipsis-truncate-styling title="Casted Transcript">Casted Transcript</yt-formatted-string></h2></div></div></ytd-engagement-panel-title-header-renderer>')

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
