import eventManager from "@/src/utils/EventManager";
import { debug, browserColorLog } from "@/src/utils/utilities";

import { createElement, fetchTranscribeApi, registerGlobalClickListener, waitSetInnerHTML, getVideoContainer, removeGlobalClickListener } from "./utils";

// NOTE: remove event listeners when panel is closed?

type Language = string;
type LangString = Map<Language, string>;
interface SegmentData {
        fullCaption: LangString;
        captionPieces: LangString[];
	startTime_s: number;
	endTime_s: number;
	element: HTMLElement;
}

export const loadTranscriptSegments = async (castTranscriptPanel: HTMLElement) => {	
	await setSegments(castTranscriptPanel, [createFakeSegmentData("Loading...")]);

	/*
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
	       const newSegmentDatas = responseJson.transcription.chunks.map(segmentJson => ({fullCaption: new Map([["original", segmentJson.text]]),
									     captionPieces: [new Map([["original", segmentJson.text]])],
									     startTime_s: segmentJson.timestamp[0],
									     endTime_s: segmentJson.timestamp[1],
									     element: createEmptySegment()}));

	       await setSegments(castTranscriptPanel, newSegmentDatas);
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
	       await setSegments(castTranscriptPanel, [createFakeSegmentData(`Network request error: ${publicErrorMsg}`)]);
	});
	*/
}

const createFakeSegmentData = (caption: string) : SegmentData => {
       return {fullCaption: new Map([["original", caption]]),
               captionPieces: [new Map([["original", caption]])],
	       startTime_s: -1,
	       endTime_s: -1,
	       element: createEmptySegment()
       };
}

var segmentDatas : SegmentData[] = []
const setSegments = async (castTranscriptPanel: HTMLElement, newSegmentDatas: SegmentData[]) => {
       clearSegments();
       
       segmentDatas = newSegmentDatas;

       const segmentListRenderer = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer");
       if (!segmentListRenderer) throw new Error("setSegments() error: could not find segmentListRenderer");

       const segmentsContainer = segmentListRenderer.querySelector("#segments-container");
       if (!segmentsContainer) throw new Error("setSegments() error: could not find segmentsContainer");

       segmentsContainer.replaceChildren(...segmentDatas.map(segmentData => segmentData.element));
       
       await Promise.allSettled(segmentDatas.map(async (segmentData) => {
	   waitSetInnerHTML(segmentData.element,  buildEmptySegmentInnerHTML(segmentData.fullCaption["original"], segmentData.startTime_s, segmentData.endTime_s));
       }));

       // For some reason, we need to set the caption data after the HTML has been created/modified,
       // because some dynamic script from Youtube immediately emptied it out.
       for (const segmentData of segmentDatas) {
	   const segment = segmentData.element;
	   const segmentCaptions = segment.querySelectorAll("yt-formatted-string");
	   for (const segmentCaption of segmentCaptions) {
	       if (segmentCaption.hasAttribute("is-empty")) {
		   segmentCaption.removeAttribute("is-empty");
		   // segmentCaption.textContent = segment.getAttribute("caption");
		   await waitSetInnerHTML(segmentCaption, buildCaptionInnerHTML(segmentData.captionPieces));
	       }
	   }
       }


       const videoContainer = getVideoContainer();
       if (!videoContainer) throw new Error("setSegments() error: cannot find videoContainer");
       
       updateActiveSegment(segmentListRenderer, videoContainer.getCurrentTime());
       attachSegmentListeners(segmentListRenderer, videoContainer);
}

const clearSegments = () => {
       for (const segmentData of segmentDatas) {
       	      removeGlobalClickListener([segmentData.element]);
       }
       eventManager.removeEventListeners("castTranscriptActiveSegments")
       segmentDatas = []
}

const attachSegmentListeners = (segmentListRenderer: HTMLElement, videoContainer: HTMLElement) => {
       const videoElement = videoContainer.querySelector("video");
       if (!videoElement) throw new Error("attachSegmentListeners() error: cannot find videoElement");
       
       eventManager.addEventListener(videoElement, "timeupdate", async (event) => {
	      updateActiveSegment(segmentListRenderer, videoContainer.getCurrentTime());
       }, "castTranscriptActiveSegments");
       
       for (const segmentData of segmentDatas) {
       	      registerGlobalClickListener([segmentData.element], (withinBoundaries) => {if (withinBoundaries) videoContainer.seekTo(segmentData.startTime_s - 1);});
       }
}

const createEmptySegment = () => {
       return createElement(`<ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""></ytd-transcript-segment-renderer>`);
}

const buildEmptySegmentInnerHTML = (originalCaption: string, startTime_s: number, endTime_s: number) => {      
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
		<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${originalCaption}">
		    <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true" style="margin-top: auto; margin-bottom: auto;">
			<div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
			    ${start_str_digits}
			</div>
		    </div>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
          	    <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">
		        <!-- leave the caption empty, because dynamic scripts would set it to empty anyways. Set it later via javascript in setSegments() -->
		    </yt-formatted-string>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
		</div>`;
}


const buildCaptionInnerHTML = (captionPieces: LangString[]) => {
        let html = "";
	for (const captionPiece of captionPieces) {
	    html += `<span>
			 <div id="caption-piece-container" style="display: inline-flex; flex-direction: column; justify-content: center; align-items: center; align-content: center">`;
	    for (const [langauge, content] of captionPiece) {
	            html += `<div id="caption-piece" captionPiece="${content}" language="${language}">
		    	         ${content}
			     </div>`;
	    }
	    html += `	 </div>
		     </span>`;
	}
	return html;
}

var prevActiveSegment = null
const updateActiveSegment = (segmentListRenderer: HTMLElement, currentTime_s: number) => {
        if (segmentDatas.length === 0) return;

	// activeSegment will be the last segment in the segmentDatas list where startTime_s <= currentTime_s
        let activeSegment = null;
	for (const segmentData of segmentDatas) {
	      if (segmentData.startTime_s < 0) continue;   // Ignore fake segments
	      if (segmentData.startTime_s > currentTime_s) break;

	      activeSegment = segmentData.element;
	}
	
	if (activeSegment && activeSegment !== prevActiveSegment) {
	        segmentDatas.forEach(segmentData => setSegmentActiveState((segmentData.element === activeSegment), segmentData.element));

		try {
		        if (segmentListRenderer) segmentListRenderer.scrollTop = getSegmentScrollY(activeSegment);
		} catch (error) {
		        // Fail silently, since this isn't essential
			console.error(new Error(`updateActiveSegment() error setting the scroll bar of the segments. Failing silently. Error: ${error.message}`))
		}
		
		prevActiveSegment = activeSegment;
	}
}

const getSegmentScrollY = (segmentElement: HTMLElement) : number => {
        if (segmentDatas.length === 0) throw new Error(`getSegmentScrollY() error: segmentDatas.length === 0 but needs to be non-empty to compute the scrollY! Failing silentl and returning -1.`);
	
        const currSegmentTop = segmentElement.getBoundingClientRect().top;
	const firstSegmentTop = segmentDatas[0].element.getBoundingClientRect().top;
	return (currSegmentTop - firstSegmentTop) + getSegmentScrollYOffset();
}

const getSegmentScrollYOffset = () : number => {
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
