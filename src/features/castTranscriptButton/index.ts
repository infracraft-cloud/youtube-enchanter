import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";
import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { loadCastTranscriptPanel, setCastTranscriptPanelVisibility } from "./transcriptPanel";
import { lazyLoadGlobalClickListener, createErrorToast } from "./utils";

export async function castTranscriptButton() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_cast_transcript_button: enableCastTranscriptButton }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the cast transcript button option is disabled, return
	if (!enableCastTranscriptButton) return;
	const castTranscriptButtonMenuItem = getFeatureButton("castTranscriptButton");
	// If the cast transcript button isn't found return
	if (!castTranscriptButtonMenuItem) {
	   // If "castTranscriptButton" menu item does not exist, add the cast transcript button menu item
	   void addCastTranscriptButton();
	}
}

export const castTranscriptButtonClickerListener = async () => {
        lazyLoadGlobalClickListener();
	// Object.keys(id_2_waitSelectMetadata).forEach((id) => Object.keys(id_2_waitSelectMetadata[id]).forEach((prop) => console.log(`${prop} => ${id_2_waitSelectMetadata[id][prop]}`)));

	try {
		const castTranscriptPanel = await loadCastTranscriptPanel();
		setCastTranscriptPanelVisibility(true, castTranscriptPanel);
	} catch (error) {
	        createErrorToast("Error creating castTranscriptPanel");
		throw error;
	}
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
	eventManager.removeEventListeners("globalClickListener");
};
