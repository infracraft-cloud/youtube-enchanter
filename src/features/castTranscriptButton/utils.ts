import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { waitForSpecificMessage } from "@/src/utils/utilities";


# TODO: 1. find initialization script
# TODO: 2. move this policy creation to initialization script
# TODO: 3. flesh out cast transcript listener
if (typeof window.trustedTypes == 'undefined') window.trustedTypes = {createPolicy: (n, rules) => rules};

export const policy = trustedTypes.createPolicy('youtube-enchanter', {
  createHTML: (string, sink) => {
    return string;
  }
});

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
		let transcriptButton = document.querySelector("#above-the-fold #title");
		transcriptButton.innerHTML = policy.createHTML("TEST");
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
