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
	const castTranscriptButtonMenuItem = getFeatureButton("castTranscriptButton");
	// If the cast transcript button isn't found return
	if (!castTranscriptButtonMenuItem) {
	   // If "castTranscriptButton" menu item does not exist, add the cast transcript button menu item
	   void addCastTranscriptButton();
	}
}
