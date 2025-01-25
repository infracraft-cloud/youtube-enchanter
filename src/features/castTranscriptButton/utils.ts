import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { id_2_waitSelectMetadata, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

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
*/

const loadCastTranscriptPanel = async () : Promise<HTMLElement> => {
        return new Promise<HTMLElement>((resolve, reject) => {
		let ret = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
		if (ret === null || ret.getAttribute("status") === "initializing") {
		    let panels = document.querySelector("#primary #below #panels");
		    if (!panels) {
			let below = document.querySelector("#primary #below");
			if (!below) {
			        reject(new Error("Could not find document.querySelector('#primary #below') in the web page, which is the required container for castTranscriptPanel!"));
			}

			panels = createStyledElement({
			       classlist: ["style-scope", "ytd-watch-flexy"],
			       elementId: "panels",
			       elementType: "div"
			});

			below.prepend(panels);
		    }

		    // Transcript panel hasn't been fully built yet, so build it from scratch
		    buildCastTranscriptPanel(panels).then((castTranscriptPanel) => {		    
			  // Launch a new promise chain to load the transcript segments, since it requires an API call and can take a very long time
			  loadTranscriptSegments(castTranscriptPanel).then(() => {
			      castTranscriptPanel.setAttribute("status", "done");
			  });

			  resolve(castTranscriptPanel);
		    });
		} else {
		    resolve(ret);
		}
	});
}

const buildCastTranscriptPanel = async (panels: HTMLElement) => {
	const castTranscriptPanel = createElement(CAST_TRANSCRIPT_PANEL_HTML);
	panels.appendChild(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties

	const castHeader = await waitCreateHTML(castTranscriptPanel.querySelector("#header"),  CAST_TRANSCRIPT_HEADER_HTML);
	// For some reason due to dynamic scripts, we must set the text content of the title after we create all the elements,
	// otherwise the scripts would modify the title to become empty.
	castHeader.querySelector("#title-text").textContent = "Casted Transcript";
	attachHeaderListeners(castTranscriptPanel);
	
	const castContent = await waitCreateHTML(castTranscriptPanel.querySelector("#content"),  CAST_TRANSCRIPT_BODY_HTML);
	attachContentListeners(castTranscriptPanel);

	castTranscriptPanel.setAttribute("status", "initialized");
	return castTranscriptPanel;
}

const attachHeaderListeners = async (castTranscriptPanel: HTMLElement) => {
        const castHeader = castTranscriptPanel.querySelector("#header");
	
	// Close button
	const closeButton = castHeader.querySelector("#visibility-button yt-button-shape");
	registerClickOutListener([closeButton], (withinBoundaries) => {if (withinBoundaries) setCastTranscriptPanelVisibility(false, castTranscriptPanel);});
}

const attachContentListeners = async (castTranscriptPanel: HTMLElement) => {
        const castContent = castTranscriptPanel.querySelector("#content");
	
	// Language dropdown menu

	const languageDropdown = castContent.querySelector("#footer #menu tp-yt-paper-menu-button");
	const languageDropdownList = languageDropdown.querySelector("tp-yt-iron-dropdown#dropdown");


	const languageDropdownTrigger = languageDropdown.querySelector("tp-yt-paper-button#label")
	listenPressed(languageDropdownTrigger, (mutation) => {setLanguageDropdownListVisibility(true, languageDropdownList);});

	const languageDropdownOptions = languageDropdown.querySelectorAll("#dropdown tp-yt-paper-item[role=option]");
	for (const languageDropdownOption of languageDropdownOptions) {
	    listenPressed(languageDropdownOption, (mutation) => {
		 for (const curr of languageDropdownOptions) {
		     if (curr.isSameNode(mutation.target)) {
			   curr.parentNode.classList.add("iron-selected"); 
		     } else {
			   curr.parentNode.classList.remove("iron-selected");
		     }
		 }
		 setLanguageDropdownListVisibility(false, languageDropdownList);
	    });
	}

	registerClickOutListener([languageDropdownTrigger, languageDropdownList], (withinBoundaries) => {if (!withinBoundaries) setLanguageDropdownListVisibility(false, languageDropdownList);});
}

const loadTranscriptSegments = (castTranscriptPanel: HTMLElement) => {
        const segmentsContainer = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer #segments-container");
	if (!segmentsContainer) throw new Error("castTranscript() error: could not find castTranscriptPanel.querySelector('ytd-transcript-segment-list-renderer #segments-container')!")
	
	setSegments(segmentsContainer, [{text: "Loading...", timestamp: [-1, -1]}]);

	return fetch(`http://localhost:8001/api/v1/stt/navigate/youtube?api-key=aaa&url=${window.location.href}`, {
	       headers: { Test: "test" },
	       method: "get"
	}).then((response) => {
	       if (response.status == 200) {
		      return response.json();
	       } else {
	              throw new Error(`populateTranscript(): fetch() returned an error with status ${response.status}: ${response.statusText}`);
	       }
	}).then((responseJson) => {
	       setSegments(segmentsContainer, responseJson.transcription.chunks);
	}).catch((error) => {
	       let publicErrorMsg = error.message;
	       let debugErrorMsg = error.message;
	       if (error.message.includes("Failed to fetch")) {
	       	     publicErrorMsg = "Failed to make network connection.";
	       	     debugErrorMsg = "populateTranscript() error: failed to make network connection. Please double check your internet connections, or if the servers are up.";
	       }
	       browserColorLog(`${debugErrorMsg}: ${error}`, "FgRed");
	       setSegments(segmentsContainer, [{text: `Network request error: ${publicErrorMsg}`, timestamp: [-1, -1]}]);
	});
}


const setSegments = (segmentsContainer: HTMLElement, segmentJsons) => {
       let segmentsHTML = "";

       for (let i = 0; i < segmentJsons.length; i++) {
	     const chunk = segmentJsons[i];
	     segmentsHTML += buildSegmentHTML(chunk.text, chunk.timestamp[0], chunk.timestamp[1]);
       }
       
       segmentsContainer.innerHTML = trustedPolicy.createHTML(segmentsHTML);
       
       const segments = segmentsContainer.querySelectorAll("div[caption]");
       for (let i = 0; i < segments.length; i++) {
	   const segment = segments[i];
	   const segmentCaption = segment.querySelector("yt-formatted-string");
	   if (segmentCaption.hasAttribute("is-empty")) {
	       segmentCaption.removeAttribute("is-empty");
	       segmentCaption.textContent = segment.getAttribute("caption");
	   }
       }
}

const buildSegmentHTML = (caption: string, start_timestamp_s: number, end_timestamp_s: number) => {      
	const start_hour = Math.floor(start_timestamp_s / 3600);
	const start_min = Math.floor((start_timestamp_s % 3600) / 60);
	const start_sec = Math.floor(start_timestamp_s % 60);

	let start_str_words = "";
	let start_str_digits = "";
	if (start_timestamp_s >= 0) {
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

	return `<div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="${start_str_words} ${caption}" caption="${caption}">
	       	     <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
		     	  <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">${start_str_digits}</div>
		     </div>
		     <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
		     <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">
		     	 ${caption}
		     </yt-formatted-string>
		     <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
	       </div>`;
}

export const castTranscriptButtonClickerListener = async () => {
        initializeClickOutListener();
	// Object.keys(id_2_waitSelectMetadata).forEach((id) => Object.keys(id_2_waitSelectMetadata[id]).forEach((prop) => console.log(`${prop} => ${id_2_waitSelectMetadata[id][prop]}`)));
        const castTranscriptPanel = await loadCastTranscriptPanel();
	setCastTranscriptPanelVisibility(true, castTranscriptPanel);
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
	eventManager.removeEventListeners("castTranscriptButton");
};

const createElement = (html: string) : HTMLElement => {
	const placeholder = createStyledElement({
		elementType: "div",
	});
	placeholder.innerHTML = trustedPolicy.createHTML(html);
	return placeholder.children[0];
}

const newJobRe = new RegExp("<!--\\s*yte.waitCreateHTML.startFragment=`([^`]*)`\\s*-->(.*)<!--\\s*yte.waitCreateHTML.endFragment=`\\1`\\s*-->", "gs");
/*
    Ideally we could modify the Youtube HTML in a single pass, but due to the dynamic scripts that run, and that a lot of custom Youtube
    elements might posibly be isolated iframes, we must create the element.innerHTML in multiple passes. In each pass, we wait for the confirmation
    that the element was created and written to the DOM before moving to the nxt step.

    In order to do this, in the HTML, mark the sections that should be create in later passes with
      ..prev HTML snippet
        <!--yte.waitCreateHTML.startFragment=`<selector>`-->
	  ..HTML snippet to add to <selector>
	<!--yte.waitCreateHTML.endFragment=`<selector>`-->
      ..post HTML snippet

    This way, on the initial pass, the DOM would create
      ..prev HTML snippet
      ..post HTML snippet
    and once this is confirmed to have been created, then on the next step it creates the inner HTML snippet of the element that matches the
    CSS selector <selector>.

    This can be chained recursively, i.e.
      ..prev HTML snippet1
        <!--yte.waitCreateHTML.startFragment=`<selector1>`-->
	  ..prev HTML snippet2
	    <!--yte.waitCreateHTML.startFragment=`<selector2>`-->
	      ..HTML snippet to add to <selector>
	    <!--yte.waitCreateHTML.endFragment=`<selector2>`-->
	  ..post HTML snippet2
	<!--yte.waitCreateHTML.endFragment=`<selector1>`-->
      ..post HTML snippet1
    and selector1 would have to be confirmed to be created before creating selector2. Note that in these recursive use cases, selector2 would
    be the CSS selector of the element assuming selector1 is the root element of the query, not the absolute document.
*/
const waitCreateHTML = async (root: HTMLElement, html: string) => {
        debug(`Entering waitCreateHTML with root=${root.tagName} ${root.classList}`);
	
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
	    
	    debug(`waitCreateHTML found match at startIdx=${startIdx} with selector=${selector}`);
	}
	truncatedHTML += html.substring(prevEndIdx);
	
        debug(`waitCreateHTML with root=${root.tagName} ${root.classList}: found fragments: ${Object.keys(selector_to_job)}}`);

	root.innerHTML = trustedPolicy.createHTML(truncatedHTML);

	await Promise.all(Object.values(selector_to_job).map(async (job) => {
	    const child = await waitSelect(root, job.selector);
	    return waitCreateHTML(child, job.fragment);
	}));
	
	return root;
}

const listenAttributeMutation = (element: HTMLElement, attribute: string, callback: (mutation: MutationRecord) => void) => {
	const config = { attributes: true, attributeFilter: [attribute] };

	const observer = new MutationObserver((mutations) => {
	    for (const mutation of mutations) {
		if (mutation.type === "attributes" && mutation.attributeName === attribute) {
		    callback(mutation);
		}
	    }
	});

	observer.observe(element, config);
}

const listenPressed = (element: HTMLElement, callback: (mutation: MutationRecord) => void) => {
	listenAttributeMutation(element, "pressed", (mutation) => {
	     if (!mutation.target.hasAttribute("pressed")) {
		 // User has let go of "pressed" on this element
		 callback(mutation);
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
	     // languageDropdownList.setAttribute("focused", "")
	     languageDropdownList.removeAttribute("aria-hidden");
	     activeOption ? activeOption.focus() : languageDropdownList.focus();

	     // Now that the dropdown has been rendered, we know its width/height, so check if its spilling out of the viewport. If so, reposition it back in
	     const rect = languageDropdownList.getBoundingClientRect();
	     let adjustX = Math.min(0, window.innerWidth - (rect.right + 20));
	     let adjustY = Math.min(0, window.innerHeight - (rect.bottom + 20));
	     languageDropdownList.style = `outline: none; position: fixed; left: ${parentRect.left + adjustX}px; top: ${parentRect.top + adjustY}px; z-index: 2202;`;
	} else {
	     languageDropdownList.style = "outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202; display: none;";
	     // languageDropdownList.removeAttribute("focused");
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

const clickOutRegistry = []
const registerClickOutListener = (elements: HTMLElement[], callback: (withinBoundaries: boolean) => void) => {
        clickOutRegistry.push([elements, callback]);
}

const initializeClickOutListener = () => {
        document.addEventListener('click', (event) => {
	    for (const [elements, callback] of clickOutRegistry) {
	          const withinBoundaries = elements.some(element => event.composedPath().includes(element));
		  callback(withinBoundaries); 
	    }
	});
}