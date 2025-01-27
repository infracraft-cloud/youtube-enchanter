import eventManager from "@/src/utils/EventManager";
import { debug, browserColorLog } from "@/src/utils/utilities";

import { createElement, fetchTranscribeApi, registerGlobalClickListener, waitSetInnerHTML, getVideoContainer, removeGlobalClickListener } from "./utils";

// NOTE: set vertical margin to auto for <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">

export const loadTranscriptSegments = async (castTranscriptPanel: HTMLElement) => {	
	await setSegments(castTranscriptPanel, [{text: "Loading...", timestamp: [-1, -1]}]);

	// Launch a new promise chain without 'await' to asynchronously load the transcript segments
	// Since it requires a compute-intensive API call, it can take a very long time, so
	// we don't want to synchronously wait for the result.
        fetchTranscribeApi().then(async (response) => {
	       if (response.status == 200) {
		      return response.json();
	       } else {
	       	      let json = {};
	              try {
		      	    json = await response.json();
		      } catch (error) {
	                    throw new Error(`populateTranscript(): fetch() returned an error with status ${response.status}: ${response.statusText}`);
		      }
         	      throw new Error(`populateTranscript(): fetch() returned an error with status ${response.status}: ${response.statusText} (response=${JSON.stringify(json)})`);
	       }
	}).then(async (responseJson) => {
	       await setSegments(castTranscriptPanel, responseJson.transcription.chunks);
	}).catch(async (error) => {
	       let publicErrorMsg = error.message;
	       let debugErrorMsg = error.message;
	       if (error.message.includes("Failed to fetch")) {
	       	     publicErrorMsg = "Failed to make network connection.";
	       	     debugErrorMsg = "loadTranscriptSegments() error: failed to make network connection. Please double check your internet connections, or if the servers are up.";
	       }

	       // Strip out the developer details in the UI
	       const responseIdx = publicErrorMsg.indexOf(" (response=");
	       if (responseIdx >= 0) {
	       	  publicErrorMsg = publicErrorMsg.substring(0, responseIdx);
	       }
	       
	       browserColorLog(`${debugErrorMsg}: ${error}`, "FgRed");
	       await setSegments(castTranscriptPanel, [{text: `Network request error: ${publicErrorMsg}`, timestamp: [-1, -1]}]);
	});
}


var segmentDatas = []
const setSegments = async (castTranscriptPanel: HTMLElement, segmentJsons) => {
       clearSegments();

       const segmentListRenderer = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer");
       if (!segmentListRenderer) throw new Error("setSegments() error: could not find segmentListRenderer");

       const segmentsContainer = segmentListRenderer.querySelector("#segments-container");
       if (!segmentsContainer) throw new Error("setSegments() error: could not find segmentsContainer");
	
       segmentDatas = segmentJsons.map(segmentJson => ({caption: segmentJson.text, startTime_s: segmentJson.timestamp[0], endTime_s: segmentJson.timestamp[1], element: createEmptySegment(segmentJson.text)}));
       segmentsContainer.replaceChildren(...segmentDatas.map(segmentData => segmentData.element));
       
       await Promise.allSettled(segmentDatas.map(async (segmentData) => {
	   waitSetInnerHTML(segmentData.element,  buildSegmentInnerHTML(segmentData.caption, segmentData.startTime_s, segmentData.endTime_s));
       }));

       // For some reason, we need to set some of the segment attributes again after the HTML
       // has been created, because some dynamic script from Youtube immediately emptied it out.
       for (const segmentData of segmentDatas) {
	   const segment = segmentData.element;
	   const segmentCaptions = segment.querySelectorAll("yt-formatted-string");
	   for (const segmentCaption of segmentCaptions) {
	       if (segmentCaption.hasAttribute("is-empty")) {
		   segmentCaption.removeAttribute("is-empty");
		   // segmentCaption.textContent = segment.getAttribute("caption");
		   await waitSetInnerHTML(segmentCaption, `<table><tbody><tr><td>${segment.getAttribute("caption")}</td></tr></tbody></table>`);
	       }
	   }
       }

       attachSegmentListeners(segmentListRenderer);
}

const clearSegments = () => {
       for (const segmentData of segmentDatas) {
       	      removeGlobalClickListener([segmentData.element]);
       }
       eventManager.removeEventListeners("castTranscriptActiveSegments")
       segmentDatas = []
}

const attachSegmentListeners = (segmentListRenderer: HTMLElement) => {
       const videoContainer = getVideoContainer();
       if (!videoContainer) throw new Error("attachSegmentListeners() error: cannot find videoContainer");

       const videoElement = videoContainer.querySelector("video");
       if (!videoElement) throw new Error("attachSegmentListeners() error: cannot find videoElement");
       
       eventManager.addEventListener(videoElement, "timeupdate", async (event) => {
	      updateActiveSegments(videoContainer.getCurrentTime(), segmentListRenderer);
       }, "castTranscriptActiveSegments");
       
       for (const segmentData of segmentDatas) {
       	      registerGlobalClickListener([segmentData.element], (withinBoundaries) => {if (withinBoundaries) videoContainer.seekTo(segmentData.startTime_s - 1);});
       }
}

const createEmptySegment = (caption: string) => {
       return createElement(`<ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container="" caption="${caption}"></ytd-transcript-segment-renderer>`);
}

const buildSegmentInnerHTML = (caption: string, startTime_s: number, endTime_s: number) => {      
	const start_hour = Math.floor(startTime_s / 3600);
	const start_min = Math.floor((startTime_s % 3600) / 60);
	const start_sec = Math.floor(startTime_s % 60);

	let start_str_words = "";
	let start_str_digits = "";
	if (startTime_s >= 0) {
	      if (startTime_s > 0) {
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

	let rowHTML = "";
	

	return `<!--css-build:shady-->
		<!--css-build:shady-->
		<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${caption}">
		    <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true" style="margin-top: auto; margin-bottom: auto;">
			<div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
			    ${start_str_digits}
			</div>
		    </div>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
          	    <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">
		        <!-- leave the caption empty, because dynamic scripts would set it to empty anyways. Set it later via javascript -->
		    </yt-formatted-string>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
		</div>`;
}

var prevHighestActiveSegment = null
const updateActiveSegments = (currentTime_s: number, segmentListRenderer: HTMLElement) => {
        const activeSegments = segmentDatas.map(segmentData => (Math.floor(segmentData.startTime_s) <= Math.floor(currentTime_s) && Math.floor(segmentData.endTime_s) > Math.floor(currentTime_s)));
	if (activeSegments.every(activeSegment => activeSegment == false)) {
	       // No change, so keep same as before
	       return;
	}

        let highestActiveSegment = null;
	for (const [idx, segmentData] of segmentDatas.entries()) {
	       const isActive = activeSegments[idx];
	       setSegmentActiveState(isActive, segmentData.element);

	       if (isActive) {
		      const top = segmentData.element.getBoundingClientRect().top;
		      if (highestActiveSegment === null || top < highestActiveSegment.getBoundingClientRect().top) {
			      highestActiveSegment = segmentData.element;
		      }

	       }
	}

	if (segmentListRenderer && highestActiveSegment && highestActiveSegment !== prevHighestActiveSegment) {
	        const scrollY = highestActiveSegment.getBoundingClientRect().top - segmentDatas[0].element.getBoundingClientRect().top;
	        segmentListRenderer.scrollTop = scrollY + getSegmentsScrollYOffset();
		prevHighestActiveSegment = highestActiveSegment;
	}
}

const getSegmentsScrollYOffset = () : number => {
        if (!segmentDatas || segmentDatas.length == 0) {
	        return 0;
	}

	const first = 0;
	const third = Math.min(2, segmentDatas.length-1);
	return segmentDatas[first].element.getBoundingClientRect().top - segmentDatas[third].element.getBoundingClientRect().top;
}

const setSegmentActiveState = (active: boolean, segment: HTMLElement) => {
        if (active && !segment.classList.contains("active")) {
	        segment.classList.add("active");
	} else if (!active && segment.classList.contains("active")) {
	        segment.classList.remove("active");
	}
	// Else, we don't need to change anything, do nothing
}
