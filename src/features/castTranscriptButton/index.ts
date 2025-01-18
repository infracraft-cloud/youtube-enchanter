import { removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureButton } from "@/src/features/buttonPlacement/utils";
import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { addCastTranscriptButton } from "./utils";

export async function castTranscriptButton() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_cast_transcript_button: enableCastTranscriptButton }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	// If the cast transcript button option is disabled, return
	if (!enableCastTranscriptButton) return;
	await waitForAllElements(["ytd-video-description-cast-transcript-section-renderer button"]);
	const castTranscriptButton = document.querySelector("ytd-video-description-cast-transcript-section-renderer button");
	const castTranscriptButtonMenuItem = getFeatureButton("castTranscriptButton");
	// If the cast transcript button is not found and the "castTranscriptButton" menu item exists, remove the cast transcript button menu item
	if (!castTranscriptButton && castTranscriptButtonMenuItem) await removeFeatureButton("castTranscriptButton");
	// If the cast transcript button isn't found return
	if (!castTranscriptButton) return;
	// If the cast transcript button is found and the "castTranscriptButton" menu item does not exist, add the cast transcript button menu item
	void addCastTranscriptButton();
}
