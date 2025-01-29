import eventManager from "@/src/utils/EventManager";
import { debug, browserColorLog } from "@/src/utils/utilities";

import { createElement, fetchTranscribeApi, registerGlobalClickListener, waitSetInnerHTML, getVideoContainer, removeGlobalClickListener } from "./utils";

// NOTE: remove event listeners when panel is closed?

interface TNote {
	startIdx: number;
	endIdx: number;
	translation: str;
	
	subnotes: TNote[];
}

interface Translation {
	fromLang: str;
	toLang: str;

	fullTranslation: TNote;
}

interface SegmentData {
        caption: str;
	startTime_s: number;
	endTime_s: number;
	element: HTMLElement;

	translations: Translation[];
}

export const loadTranscriptSegments = async (castTranscriptPanel: HTMLElement) => {	
	await setSegments(castTranscriptPanel, [createFakeSegmentData("Loading...")], "loading");

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
	       const newSegmentDatas = responseJson.transcription.chunks.map(segmentJson => ({caption: segmentJson.text,
											      startTime_s: segmentJson.timestamp[0],
											      endTime_s: segmentJson.timestamp[1],
											      element: createEmptySegment(),
											      translations: [] }));

	       await setSegments(castTranscriptPanel, newSegmentDatas, "done");
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
	       await setSegments(castTranscriptPanel, [createFakeSegmentData(`Network request error: ${publicErrorMsg}`)], "error");
	});
*/
}

const createFakeSegmentData = (caption: string) : SegmentData => {
       return {caption: caption,
	       startTime_s: -1,
	       endTime_s: -1,
	       element: createEmptySegment(),
	       translations: [{fromLang: "en", toLang: "spanish", fullTranslation: {startIdx: 0, endIdx: caption.length, translation: "blahblahblah", subnotes: [{startIdx: 1, endIdx: 2, translation: "1111", subnotes: []}, {startIdx: 2, endIdx: 3, translation: "222", subnotes: []}]}}]
       };
}

var segmentDatas : SegmentData[] = []
const setSegments = async (castTranscriptPanel: HTMLElement, newSegmentDatas: SegmentData[], segmentStatus: string) => {
       clearSegments();

       const segmentListRenderer = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer");
       if (!segmentListRenderer) throw new Error("setSegments() error: could not find segmentListRenderer");

       const segmentsContainer = segmentListRenderer.querySelector("#segments-container");
       if (!segmentsContainer) throw new Error("setSegments() error: could not find segmentsContainer");

       segmentDatas = newSegmentDatas;

       segmentsContainer.setAttribute("status", segmentStatus);
       segmentsContainer.replaceChildren(...segmentDatas.map(segmentData => segmentData.element));
       
       await Promise.allSettled(segmentDatas.map(async (segmentData) => {
	   waitSetInnerHTML(segmentData.element,  buildEmptySegmentInnerHTML(segmentData.caption, segmentData.startTime_s, segmentData.endTime_s));
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
		   await waitSetInnerHTML(segmentCaption, buildCaptionInnerHTML(segmentData));
	       }
	   }
       }


       // The following code below can fail and throw an exception AFTER the segments initialization,
       // since they are non-essential features
       
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


const buildCaptionInnerHTML = (segmentData: SegmentData) => {
        if (!segmentData.translations || segmentData.translations.length == 0) return segmentData.caption;  // No translation data, so just return a simple text node

	// If the code reaches here, there is translation data, so we must format it correctly;
	const uniqueIdxs = new Set();
	uniqueIdxs.add(0);
	uniqueIdxs.add(segmentData.caption.length);
	for (const translation of segmentData.translations) {
	    recurseTnotes(translation.fullTranslation, 0, (curr, level) => {uniqueIdxs.add(curr.startIdx); uniqueIdxs.add(curr.endIdx);}, null);
	}

	const captionSliceIdxs = Array.from(uniqueIdxs);
	captionSliceIdxs.sort((a, b) => a - b);

	console.log(`"TEST1 ${captionSliceIdxs}`);

	const captionPieces = []
	let prevCaptionSliceIdx = null;
	for (const captionSliceIdx of captionSliceIdxs) {
	    if (prevCaptionSliceIdx !== null) captionPieces.push(segmentData.caption.substring(prevCaptionSliceIdx, captionSliceIdx));

	    prevCaptionSliceIdx = captionSliceIdx;	    
	}
	// Don't have to worry about the edge case of the first/last segment of the caption, since
	// 0 and caption.length is always included in uniqueIdxs and captionSliceIdxs
	
	console.log(`"TEST2 ${captionPieces}`);
	
        let html = `<table>
	                <tbody>`;

	html += `        <tr language="original" depth="0">`;
	for (const captionPiece of captionPieces) {
	    html += `            <td style="text-align: center; vertical-align: middle;">
	                             ${captionPiece}
				 </td>`;
	}
	html += `        </tr>`;


	for (const translation of segmentData.translations) {
	    if (!translation.fullTranslation) throw new Error(`buildCaptionInnerHTML() error: malformed translation data with missing .fullTranslation field: {translation}`);
	    
	    const depth_2_noteTdIdxs = []
	    recurseTnotes(translation.fullTranslation, 0, (curr, depth) => {	
	        if (!(depth in depth_2_noteTdIdxs)) depth_2_noteTdIdxs[depth] = [];
	        const noteTdIdxs = depth_2_noteTdIdxs[depth];
		
	    	// tnote.startIdx and captionSliceIdxs are string indexes
		// We must convert these to <td> indexes
		const tdStartIdx = captionSliceIdxs.findLastIndex(idx => idx <= curr.startIdx );
		const tdEndIdx = captionSliceIdxs.findIndex(idx => idx >= curr.endIdx );
		
		noteTdIdxs.push({tnote: curr, tdStartIdx: tdStartIdx, tdEndIdx: tdEndIdx});
	    }, null);
	    for (const [depth, noteTdIdxs] of depth_2_noteTdIdxs.entries()) {
	        noteTdIdxs.sort((a, b) => a.tdstartIdx - b.tdStartIdx);
	    }
	    const maxDepth = Math.max(...Object.keys(depth_2_noteTdIdxs));

	    console.log(`TEST3: ${depth_2_noteTdIdxs} / ${maxDepth}`);
	    for (let depth = 0; depth <= maxDepth; depth++) {
		html += `        <tr language="${translation.toLang}" depth="${depth}">`;
	        if (depth in depth_2_noteTdIdxs) {
		    const noteTdIdxs = depth_2_noteTdIdxs[depth]
		    
		    let tdHtml = ""
		    let firstSeenTdStartIdx = null;
		    let lastSeenTdEndIdx = null;
		    for (const noteTdIdx of noteTdIdxs) {
			if (firstSeenTdStartIdx == null) firstSeenTdStartIdx = noteTdIdx.tdStartIdx;
			lastSeenTdEndIdx = noteTdIdx.tdEndIdx;

			tdHtml += `<td colspan="${noteTdIdx.tdEndIdx - noteTdIdx.tdStartIdx}" style="text-align: center; vertical-align: middle;">${noteTdIdx.tnote.translation}</td>`;
		    }

		    if (firstSeenTdStartIdx && firstSeenTdStartIdx !== 0) {
			tdHtml = `<td colspan="${firstSeenTdStartIdx}"></td>` + tdHtml;
		    }

		    if (lastSeenTdEndIdx && lastSeenTdEndIdx < captionPieces.length) {
			tdHtml += `<td colspan="${captionPieces.length - lastSeenTdEndIdx}"></td>`;
		    }

		    html += tdHtml;
		}
		html += `        </tr>`;
	    }
	}


	html += `    </tbody>
	         </table>`;
		 
	return html;
}

const recurseTnotes = (tnote: TNote, depth: number = 0, preCallback: (curr: TNote, depth: number) => void, postCallback: (curr: TNote, depth: number) => void) => {
       if (preCallback) preCallback(tnote, depth);

       tnote.subnotes.forEach(subnote => recurseTnotes(subnote, depth+1, preCallback, postCallback));

       if (postCallback) postCallback(tnote, depth);
}

/*
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
*/


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
