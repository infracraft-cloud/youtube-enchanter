import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { isShortsPage, isWatchPage, id_2_waitSelectMetadata, waitForSpecificMessage } from "@/src/utils/utilities";

import { DEBUG, debug, browserColorLog, createStyledElement, waitSelect } from "@/src/utils/utilities";
import { trustedPolicy} from "@/src/pages/embedded";

import { CAST_TRANSCRIPT_PANEL_HTML, CAST_TRANSCRIPT_HEADER_HTML, CAST_TRANSCRIPT_BODY_HTML } from "./constants";


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


error handling in buildCastTranscriptPanel, waitSetInner, event listeners
*/

const DEBUG_WAIT_SET_INNER_HTML = d_ws = false;

const loadCastTranscriptPanel = async () : Promise<HTMLElement> => {
	let ret = document.querySelector("#primary #below #panels ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (ret !== null && ret.getAttribute("status") !== "initializing") return ret;  // Already built, so just return it

        // Transcript panel hasn't been fully built yet, so build it from scratch	
	const panels = getPanelsContainer();
	const castTranscriptPanel = await buildCastTranscriptPanel(panels);

	return castTranscriptPanel;
}

const buildCastTranscriptPanel = async (panels: HTMLElement) => {
	const castTranscriptPanel = createElement(CAST_TRANSCRIPT_PANEL_HTML);
	panels.appendChild(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties

	if (d_ws) debug("[buildCastTranscriptPanel] building header");
	const castHeader = castTranscriptPanel.querySelector("#header");
	await waitSetInnerHTML(castHeader,  CAST_TRANSCRIPT_HEADER_HTML);
	// For some reason due to dynamic scripts, we must set the text content of the title after we have created all the elements,
	// otherwise the scripts would modify the title to become empty.
	if (d_ws) debug("[buildCastTranscriptPanel] building header initialized -- attaching listeners");
	castHeader.querySelector("#title-text").textContent = "Casted Transcript";
	attachHeaderListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building header done!");


	if (d_ws) debug("[buildCastTranscriptPanel] building content");
	const castContent = castTranscriptPanel.querySelector("#content");
	await waitSetInnerHTML(castContent,  CAST_TRANSCRIPT_BODY_HTML);
	if (d_ws) debug("[buildCastTranscriptPanel] building content initialized -- attaching listeners");
	attachContentListeners(castTranscriptPanel);
	if (d_ws) debug("[buildCastTranscriptPanel] building content done!");

	castTranscriptPanel.setAttribute("status", "initialized");
	await loadTranscriptSegments(castTranscriptPanel);
	
	return castTranscriptPanel;
}

const attachHeaderListeners = (castTranscriptPanel: HTMLElement) => {
        const castHeader = castTranscriptPanel.querySelector("#header");
	if (!castHeader) throw new Error("attachHeaderListeners() error: cannot find castHeader");
	
	const closeButton = castHeader.querySelector("#visibility-button yt-button-shape");
	if (!closeButton) throw new Error("attachHeaderListeners() error: cannot find castHeader closeButton");
	
	registerGlobalClickListener([closeButton], (withinBoundaries) => {if (withinBoundaries) setCastTranscriptPanelVisibility(false, castTranscriptPanel);});
}

const attachContentListeners = (castTranscriptPanel: HTMLElement) => {
        const castContent = castTranscriptPanel.querySelector("#content");
	if (!castContent) throw new Error("attachContentListeners() error: cannot find castContent");
	
	// Language dropdown menu

	const languageDropdown = castContent.querySelector("#footer #menu tp-yt-paper-menu-button");
	if (!languageDropdown) throw new Error("attachContentListeners() error: cannot find castContent languageDropdown");
	const languageDropdownList = languageDropdown.querySelector("tp-yt-iron-dropdown#dropdown");
	if (!languageDropdownList) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownList");
	const languageDropdownTrigger = languageDropdown.querySelector("tp-yt-paper-button#label");
	if (!languageDropdownTrigger) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownTrigger");
	const languageDropdownOptions = languageDropdown.querySelectorAll("#dropdown tp-yt-paper-item[role=option]");
	if (!languageDropdownOptions) throw new Error("attachContentListeners() error: cannot find castContent languageDropdownOptions");
	
	for (const languageDropdownOption of languageDropdownOptions) {
	    listenAttributePressed(languageDropdownOption, (mutation) => {
		 for (const curr of languageDropdownOptions) {
		     if (curr.isSameNode(mutation.target)) {
			   curr.parentNode.classList.add("iron-selected");
			   const optionText = curr.querySelector("#item-with-badge").textContent.trim();
			   
			   const triggerText = languageDropdownTrigger.querySelector("#label-text");
			   if (triggerText) {
			         triggerText.textContent = optionText;
			   } else {
			         browserColorLog("languageDropdownOption.pressed() error: cannot find triggerText, unable to update the text of languageDropdownTrigger!", "FgRed");
			   }
		     } else {
			   curr.parentNode.classList.remove("iron-selected");
		     }
		 }
		 setLanguageDropdownListVisibility(false, languageDropdownList);
	    });
	}

	registerGlobalClickListener([languageDropdownTrigger, languageDropdownList], (withinBoundaries) => {if (!withinBoundaries) setLanguageDropdownListVisibility(false, languageDropdownList);});
	listenAttributePressed(languageDropdownTrigger, (mutation) => {setLanguageDropdownListVisibility(true, languageDropdownList);});
}

const loadTranscriptSegments = async (castTranscriptPanel: HTMLElement) => {	
	await setSegments(castTranscriptPanel, [{text: "Loading...", timestamp: [-1, -1]}]);

	// Launch a new promise chain without 'await' to asynchronously load the transcript segments
	// Since it requires a compute-intensive API call, it can take a very long time, so
	// we don't want to synchronously wait for the result.
	fetch(`http://localhost:8001/api/v1/stt/youtube/transcribe?api-key=aaa&url=${encodeURIComponent(window.location.href, "utf-8")}`, {
	       headers: { Test: "test" },
	       method: "get"
	}).then(async (response) => {
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
	   const segmentCaption = segment.querySelector("yt-formatted-string");
	   if (segmentCaption.hasAttribute("is-empty")) {
	       segmentCaption.removeAttribute("is-empty");
	       segmentCaption.textContent = segment.getAttribute("caption");
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
       	      registerGlobalClickListener([segmentData.element], (withinBoundaries) => {if (withinBoundaries) videoContainer.seekTo(segmentData.startTime_s);});
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

	return `<!--css-build:shady-->
		<!--css-build:shady-->
		<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${caption}">
		    <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
			<div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
			    ${start_str_digits}
			</div>
		    </div>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
		    <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">
			${caption}
		    </yt-formatted-string>
		    <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
		</div>`;
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

const createElement = (html: string) : HTMLElement => {
	const placeholder = createStyledElement({
		elementType: "div",
	});
	placeholder.innerHTML = trustedPolicy.createHTML(html);
	return placeholder.children[0];
}

const newJobRe = new RegExp("<!--\\s*yte.waitSetInnerHTML.startFragment=`([^`]*)`\\s*-->(.*)<!--\\s*yte.waitSetInnerHTML.endFragment=`\\1`\\s*-->", "gs");
/*
    Ideally we could modify the Youtube HTML in a single pass, but due to the dynamic scripts that run, and that a lot of custom Youtube
    elements might posibly be isolated iframes, we must create the element.innerHTML in multiple passes. In each pass, we wait for the confirmation
    that the element was created and written to the DOM before moving to the nxt step.

    In order to do this, in the HTML, mark the sections that should be create in later passes with
      ..prev HTML snippet
        <!--yte.waitSetInnerHTML.startFragment=`<selector>`-->
	  ..HTML snippet to add to <selector>
	<!--yte.waitSetInnerHTML.endFragment=`<selector>`-->
      ..post HTML snippet

    This way, on the initial pass, the DOM would create
      ..prev HTML snippet
      ..post HTML snippet
    and once this is confirmed to have been created, then on the next step it creates the inner HTML snippet of the element that matches the
    CSS selector <selector>.

    This can be chained recursively, i.e.
      ..prev HTML snippet1
        <!--yte.waitSetInnerHTML.startFragment=`<selector1>`-->
	  ..prev HTML snippet2
	    <!--yte.waitSetInnerHTML.startFragment=`<selector2>`-->
	      ..HTML snippet to add to <selector>
	    <!--yte.waitSetInnerHTML.endFragment=`<selector2>`-->
	  ..post HTML snippet2
	<!--yte.waitSetInnerHTML.endFragment=`<selector1>`-->
      ..post HTML snippet1
    and selector1 would have to be confirmed to be created before creating selector2. Note that in these recursive use cases, selector2 would
    be the CSS selector of the element assuming selector1 is the root element of the query, not the absolute document.
*/
const waitSetInnerHTML = async (root: HTMLElement, html: string) => {
        if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: start`);
	
        const selector_to_job = {}

	let truncatedHTML = ""
	let prevEndIdx = 0;
	const matchers = html.matchAll(newJobRe);
	for (const match of matchers) {
	    const startIdx = match.index;
	    const endIdx = startIdx + match[0].length;
	    truncatedHTML += html.substring(prevEndIdx, startIdx);
	    prevEndIdx = endIdx;
	    
	    const selector = match[1];
	    const innerHTML = match[2];
	    selector_to_job[selector] = {
	            selector: selector,
		    fragment: innerHTML,
		    asyncToWait: null
	    };
	    
	    if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: found match at startIdx=${startIdx} with selector ${selector}`);
	}
	truncatedHTML += html.substring(prevEndIdx);
	
	if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: found ${Object.keys(selector_to_job).length} fragments: [${Object.keys(selector_to_job)}]`);
	if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: creating HTML of truncated input`);

	root.innerHTML = trustedPolicy.createHTML(truncatedHTML);

	if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: awaiting async promises...`);
	
	await Promise.allSettled(Object.values(selector_to_job).map(async (job) => {
	    const child = await waitSelect(root, job.selector);
	    return waitSetInnerHTML(child, job.fragment);
	}));
	
        if (d_ws) debug(`[waitSetInnerHTML] root=${root.tagName}, id=${root.id}, class=${root.classList}: awaiting async promises done!`);
	
	return root;
}

const listenAttributeMutation = (element: HTMLElement, attribute: string, callback: (mutation: MutationRecord, observer: MutationObserver) => void) => {
	const config = { attributes: true, attributeFilter: [attribute] };

	const observer = new MutationObserver((mutations) => {
	    for (const mutation of mutations) {
		if (mutation.type === "attributes" && mutation.attributeName === attribute) {
		    callback(mutation, observer);
		}
	    }
	});

	observer.observe(element, config);
}

const listenAttributePressed = (element: HTMLElement, callback: (mutation: MutationRecord, observer: MutationObserver) => void) => {
	listenAttributeMutation(element, "pressed", (mutation, observer) => {
	     if (!mutation.target.hasAttribute("pressed")) {
		 // User has let go of "pressed" on this element
		 callback(mutation, observer);
	     }
	});
}

const setLanguageDropdownListVisibility = (visible: boolean, languageDropdownList?: HTMLElement) => {
        if (!languageDropdownList) languageDropdownList = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript] #footer #menu tp-yt-iron-dropdown#dropdown");
	if (!languageDropdownList) {
	     console.log("setLanguageDropdownListVisibility() error: could not find languageDropdownList");
	     return;
	}

	const activeOption = languageDropdownList.querySelector("a[class~=iron-selected] tp-yt-paper-item");
	const parentRect = languageDropdownList.parentNode.getBoundingClientRect();
	 
	if (visible) {
	     languageDropdownList.style = `outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202;`;
	     languageDropdownList.removeAttribute("aria-hidden");
	     activeOption ? activeOption.focus() : languageDropdownList.focus();

	     // Now that the dropdown has been rendered, we know its width/height, so check if it is spilling out of the viewport. If so, reposition it back in the viewport
	     const rect = languageDropdownList.getBoundingClientRect();
	     const adjustX = Math.min(0, window.innerWidth - (rect.right + 20));
	     const adjustY = Math.min(0, window.innerHeight - (rect.bottom + 20));
	     languageDropdownList.style = `outline: none; position: fixed; left: ${parentRect.left + adjustX}px; top: ${parentRect.top + adjustY}px; z-index: 2202;`;
	} else {
	     languageDropdownList.style = "outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202; display: none;";
	     languageDropdownList.setAttribute("aria-hidden", "true");
	     activeOption ? activeOption.blur() : languageDropdownList.blur();
	}
}

const setCastTranscriptPanelVisibility = (visible: boolean, castTranscriptPanel?: HTMLElement) => {
        if (!castTranscriptPanel) castTranscriptPanel = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (!castTranscriptPanel) {
	     console.log("setCastTranscriptPanelVisibility() error: could not find castTranscriptPanel");
	     return;
	}

	if (visible) {
	     castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	} else {
	     castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN");
	}
}

var globalClickListenerInitialized = false;
const globalClickRegistry = []
const registerGlobalClickListener = (elements: HTMLElement[], callback: (withinBoundaries: boolean) => void) => {
        globalClickRegistry.push({elements: elements, callback: callback});
}

const removeGlobalClickListener = (elements: HTMLElement[]) => {
        for (const [idx, globalClickData] of Array.from(globalClickRegistry.entries()).reverse()) {
              const sameElems =  (globalClickData.elements.length === elements.length && globalClickData.elements.every((globalClickElem, idx2) => {
	      	   return globalClickElem === elements[idx2];
	      }));

	      if (sameElems) {
	      	   // Found match, so delete
		   globalClickRegistry.splice(idx, 1);
	      }
	}
}

const lazyLoadGlobalClickListener = () => {
        if (!globalClickListenerInitialized) {
	      eventManager.addEventListener(document, "click",  (event) => {
		  for (const globalClickData of globalClickRegistry) {
			const withinBoundaries = globalClickData.elements.some(element => event.composedPath().includes(element));
			globalClickData.callback(withinBoundaries); 
		  }
	      }, "globalClickListener");
	      globalClickListenerInitialized = true;
	}
}

const getPanelsContainer = () : HTMLEelement => {
	let panels = document.querySelector("#primary #below #panels");
	if (!panels) {
	    let below = document.querySelector("#primary #below");
	    if (!below) {
		    throw new Error("Could not find document.querySelector('#primary #below') in the web page, which is the required container for castTranscriptPanel!");
	    }

	    panels = createStyledElement({
		   classlist: ["style-scope", "ytd-watch-flexy"],
		   elementId: "panels",
		   elementType: "div"
	    });

	    below.prepend(panels);
	}

	return panels;
}

const createErrorToast = (errorMsg: Error) => {
        alert(`Error toast message: {error}`);
}

const getVideoContainer = () : HTMLElement => {
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	return playerContainer;
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