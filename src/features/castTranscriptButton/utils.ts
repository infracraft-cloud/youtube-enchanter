import eventManager from "@/src/utils/EventManager";
import { debug, createStyledElement, isShortsPage, isWatchPage, waitForSpecificMessage, waitSelect } from "@/src/utils/utilities";

import { trustedPolicy} from "@/src/pages/embedded";


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

export const BACKEND_HOSTNAME = "http://localhost:8001";
export const TRANSCRIBE_API_URL = `${BACKEND_HOSTNAME}/api/v1/stt/youtube/transcribe`;
export const TRANSLATE_API_URL = `${BACKEND_HOSTNAME}/api/v1/stt/youtube/translate`;

export const d_ws = DEBUG_WAIT_SET_INNER_HTML = true;


export const fetchTranscribeApi = async (youtubeVideoUrl?: string) => {
        if (!youtubeVideoUrl) youtubeVideoUrl = window.location.href;
        return fetch(`${TRANSCRIBE_API_URL}?api-key=aaa&url=${encodeURIComponent(youtubeVideoUrl, "utf-8")}`, {
	       method: "GET"
	})
}

interface TranslateQuery {
        query: string;
	toLang: string;
	fromLang?: string;
}
export const fetchTranslateApi = async (postData: TranslateQuery) => {
        return fetch(`${TRANSLATE_API_URL}?api-key=aaa`, {
	       method: "POST",
	       headers: {
		 'Accept': 'application/json',
		 'Content-Type': 'application/json'
	       },
	       body: JSON.stringify(postData)
	})
}

export const createElement = (html: string) : HTMLElement => {
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
export const waitSetInnerHTML = async (root: HTMLElement, html: string) => {
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

export const listenAttributeMutation = (element: HTMLElement, attribute: string, callback: (mutation: MutationRecord, observer: MutationObserver) => void) => {
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

export const listenAttributePressed = (element: HTMLElement, callback: (mutation: MutationRecord, observer: MutationObserver) => void) => {
	listenAttributeMutation(element, "pressed", (mutation, observer) => {
	     if (!mutation.target.hasAttribute("pressed")) {
		 // User has let go of "pressed" on this element
		 callback(mutation, observer);
	     }
	});
}


var globalClickListenerInitialized = false;
const globalClickRegistry = []
export const registerGlobalClickListener = (elements: HTMLElement[], callback: (withinBoundaries: boolean) => void) => {
        globalClickRegistry.push({elements: elements, callback: callback});
}

export const removeGlobalClickListener = (elements: HTMLElement[]) => {
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

export const lazyLoadGlobalClickListener = () => {
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

export const createErrorToast = (error: Error) => {
        alert(`Error toast message: ${error}`);
}

export const getVideoContainer = () : HTMLElement => {
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	return playerContainer;
}

