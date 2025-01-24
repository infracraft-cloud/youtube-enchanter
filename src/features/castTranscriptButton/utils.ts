import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { id_2_waitSelectMetadata, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { browserColorLog, createStyledElement, waitSelect } from "@/src/utils/utilities";
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
*/

const loadCastTranscriptPanel = async () => {
	let ret = document.querySelector("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-cast-transcript]");
	if (ret === null || ret.getAttribute("status") === "initializing") {
	    // Cast Transcript panel hasn't been fully built yet, so build it from scratch

	    // First, load the (regular) transcript panel, so that we can copy its style and structure
	    let transcriptPanel = null;
	    let loadTranscript = null;
	    let prevVisibility = null;
	    return waitSelect(document, "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]").then((transcriptPanel) => {
	    
		  // If the OpenTranscript panel has not been fully loaded yet (by checking the segments content), load it
		  loadTranscript = (transcriptPanel.querySelector("ytd-transcript-renderer ytd-transcript-search-panel-renderer ytd-transcript-segment-list-renderer") === null);
		  prevVisibility = "";
		  
		  if (loadTranscript) {
			// Make transcript panel hidden so the viewer can't see this quick load/unload behavior
			prevVisibility = transcriptPanel.style.display;
			transcriptPanel.style.visibility = "hidden";

			const transcriptButton = document.querySelector<HTMLButtonElement>("ytd-video-description-transcript-section-renderer button");
			if (transcriptButton) transcriptButton.click();
		  }


		  // While we have the transcript panel up, build the cast transcript panel by copying its structure
		  return buildCastTranscriptPanel(transcriptPanel);
	    }).then((castTranscriptPanel) => {
		  if (loadTranscript) {
			// Close the transcript panel. Remember to revert its visibility
			const closeTranscript = document.querySelector('button[aria-label="Close transcript"]')
			if (closeTranscript) closeTranscript.click();
			transcriptPanel.style.visibility = prevVisibility;
		  }

		  const castTranscriptSegments = castTranscriptPanel.querySelector("ytd-transcript-segment-list-renderer #segments-container");
		  if (castTranscriptSegments) populateCastTranscript(castTranscriptSegments).then(() => {
		     castTranscriptPanel.setAttribute("status", "done");
		  });

		  return castTranscriptPanel;
	    });
	}
	
        return ret;
}

const buildCastTranscriptPanel = async (transcriptPanel: HTMLElement) => {
	const placeholder = createStyledElement({
		elementType: "div",
	});
	placeholder.innerHTML = trustedPolicy.createHTML(`
	      <ytd-engagement-panel-section-list-renderer class="style-scope ytd-watch-flexy" modern-panels="" enable-anchored-panel="" disable-backdrop-filter="" target-id="engagement-panel-cast-transcript" visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED" style="order: -5;" status="initializing">
	      </ytd-engagement-panel-section-list-renderer>
	`);
	const castTranscriptPanel = placeholder.children[0];
	transcriptPanel.after(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties


	const headerBuilder = waitCreateHTML(castTranscriptPanel.querySelector("#header"),  `
	     <ytd-engagement-panel-title-header-renderer class="style-scope ytd-engagement-panel-section-list-renderer" enable-anchored-panel="" modern-panels=""><!--css-build:shady--><!--css-build:shady--><div id="banner" aria-hidden="true" class="style-scope ytd-engagement-panel-title-header-renderer">
		 <!--yte.waitCreateHTML.startFragment=\`ytd-engagement-panel-title-header-renderer\`-->
		 <!--css-build:shady-->
		 <!--css-build:shady-->
		 <div id="banner" aria-hidden="true" class="style-scope ytd-engagement-panel-title-header-renderer"></div>
		 <div id="ads-info-button" class="style-scope ytd-engagement-panel-title-header-renderer"></div>
		 <div id="header" class="style-scope ytd-engagement-panel-title-header-renderer">
		     <div id="navigation-button" class="style-scope ytd-engagement-panel-title-header-renderer" hidden=""></div>
		     <yt-img-shadow id="icon" class="style-scope ytd-engagement-panel-title-header-renderer no-transition" hidden=""><!--css-build:shady--><!--css-build:shady--><img id="img" draggable="false" class="style-scope yt-img-shadow" alt=""></yt-img-shadow>
		     <div id="title-container" class="style-scope ytd-engagement-panel-title-header-renderer">
			 <h2 id="title" class="style-scope ytd-engagement-panel-title-header-renderer" aria-label="Transcript" tabindex="-1">
			     <yt-formatted-string id="title-text" ellipsis-truncate="" class="style-scope ytd-engagement-panel-title-header-renderer" ellipsis-truncate-styling="" title="Transcript">
				 <!--yte.waitCreateHTML.startFragment=\`yt-formatted-string#title-text\`-->
				 Transcript
				 <!--yte.waitCreateHTML.endFragment=\`yt-formatted-string#title-text\`-->
			     </yt-formatted-string>
			     <yt-formatted-string id="contextual-info" class="style-scope ytd-engagement-panel-title-header-renderer" is-empty="function(){var e=Ha.apply(0,arguments);a.loggingStatus.currentExternalCall=b;a.loggingStatus.bypassProxyController=!0;var g,k=((g=a.is)!=null?g:a.tagName).toLowerCase();bz(k,b,&quot;PROPERTY_ACCESS_CALL_EXTERNAL&quot;);var m;g=(m=c!=null?c:d[b])==null?void 0:m.call.apply(m,[d].concat(la(e)));a.loggingStatus.currentExternalCall=void 0;a.loggingStatus.bypassProxyController=!1;return g}" hidden=""><!--css-build:shady--><!--css-build:shady--><yt-attributed-string class="style-scope yt-formatted-string"></yt-attributed-string></yt-formatted-string>
			 </h2>
			 <yt-formatted-string id="subtitle" class="style-scope ytd-engagement-panel-title-header-renderer" is-empty="function(){var e=Ha.apply(0,arguments);a.loggingStatus.currentExternalCall=b;a.loggingStatus.bypassProxyController=!0;var g,k=((g=a.is)!=null?g:a.tagName).toLowerCase();bz(k,b,&quot;PROPERTY_ACCESS_CALL_EXTERNAL&quot;);var m;g=(m=c!=null?c:d[b])==null?void 0:m.call.apply(m,[d].concat(la(e)));a.loggingStatus.currentExternalCall=void 0;a.loggingStatus.bypassProxyController=!1;return g}" hidden="">
			     <!--css-build:shady-->
			     <!--css-build:shady-->
			     <yt-attributed-string class="style-scope yt-formatted-string"></yt-attributed-string>
			 </yt-formatted-string>
			 <div id="subtitle-complex" class="style-scope ytd-engagement-panel-title-header-renderer"></div>
		     </div>
		     <div id="action-button" class="style-scope ytd-engagement-panel-title-header-renderer" hidden=""></div>
		     <div id="information-button" class="style-scope ytd-engagement-panel-title-header-renderer" hidden=""></div>
		     <div id="menu" class="style-scope ytd-engagement-panel-title-header-renderer">
			 <ytd-menu-renderer class="style-scope ytd-engagement-panel-title-header-renderer" safe-area="" menu-active="">
			     <!--css-build:shady-->
			     <!--css_build_scope:ytd-menu-renderer-->
			     <!--css_build_styles:video.youtube.src.web.polymer.shared.ui.styles.yt_base_styles.yt.base.styles.css.js-->
			     <div id="top-level-buttons-computed" class="top-level-buttons style-scope ytd-menu-renderer"></div>
			     <div id="flexible-item-buttons" class="style-scope ytd-menu-renderer"></div>
			     <yt-icon-button id="button" class="dropdown-trigger style-scope ytd-menu-renderer" style-target="button" role="button" aria-label="yt-icon-button">
			     </yt-icon-button>
				 <!--yte.waitCreateHTML.startFragment=\`yt-icon-button#button\`-->
				 <!--css-build:shady-->
				 <!--css-build:shady-->
				 <button id="button" class="style-scope yt-icon-button" aria-label="More actions">
				     <yt-icon class="style-scope ytd-menu-renderer">
					 <!--yte.waitCreateHTML.startFragment=\`yt-icon\`-->
					 <!--css-build:shady-->
					 <!--css-build:shady-->
					 <span class="yt-icon-shape style-scope yt-icon yt-spec-icon-shape">
					     <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
						 <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
						     <path d="M12 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM10.5 12c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm0-6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z"></path>
						 </svg>
					     </div>
					 </span>
					 <!--yte.waitCreateHTML.endFragment=\`yt-icon\`-->
				     </yt-icon>
				 </button>
				 <yt-interaction id="interaction" class="circular style-scope yt-icon-button">
				     <!--css-build:shady-->
				     <!--css-build:shady-->
				     <div class="stroke style-scope yt-interaction"></div>
				     <div class="fill style-scope yt-interaction"></div>
				 </yt-interaction>
				 <!--yte.waitCreateHTML.endFragment=\`yt-icon-button#button\`-->
			     <yt-button-shape id="button-shape" class="style-scope ytd-menu-renderer" disable-upgrade="" hidden=""></yt-button-shape>
			 </ytd-menu-renderer>
		     </div>
		     <div id="visibility-button" class="style-scope ytd-engagement-panel-title-header-renderer">
		         <ytd-button-renderer class="style-scope ytd-engagement-panel-title-header-renderer" button-renderer="" button-next="">
			     <!--css-build:shady-->
			     <yt-button-shape>
                		 <!--yte.waitCreateHTML.startFragment=\`#visibility-button yt-button-shape\`-->
			         <button class="yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-only-default" aria-label="Close transcript" title="" style="">
				     <div class="yt-spec-button-shape-next__icon" aria-hidden="true">
				         <yt-icon style="width: 24px; height: 24px;">
					     <!--yte.waitCreateHTML.startFragment=\`yt-icon\`-->
					     <!--css-build:shady-->
					     <!--css-build:shady-->
					     <span class="yt-icon-shape style-scope yt-icon yt-spec-icon-shape">
					         <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
						     <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
						         <path d="m12.71 12 8.15 8.15-.71.71L12 12.71l-8.15 8.15-.71-.71L11.29 12 3.15 3.85l.71-.71L12 11.29l8.15-8.15.71.71L12.71 12z"></path>
						     </svg>
						 </div>
				             </span>
					     <!--yte.waitCreateHTML.endFragment=\`yt-icon\`-->
					 </yt-icon>
			             </div>
				     <yt-touch-feedback-shape style="border-radius: inherit;">
				         <div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response" aria-hidden="true">
					     <div class="yt-spec-touch-feedback-shape__stroke" style=""></div>
					     <div class="yt-spec-touch-feedback-shape__fill" style=""></div>
					 </div>
			             </yt-touch-feedback-shape>
				 </button>
                		 <!--yte.waitCreateHTML.endFragment=\`#visibility-button yt-button-shape\`-->
		             </yt-button-shape>
			     <tp-yt-paper-tooltip offset="8" disable-upgrade=""></tp-yt-paper-tooltip>
			 </ytd-button-renderer>
	             </div>
		 </div>
		 <div id="subheader" class="style-scope ytd-engagement-panel-title-header-renderer"></div>
		 <!--yte.waitCreateHTML.endFragment=\`ytd-engagement-panel-title-header-renderer\`-->
	     </ytd-engagement-panel-title-header-renderer>
	`).then((castHeader) => {
	      castHeader.querySelector("#title-text").textContent = "Casted Transcript";
	});;

	
	const contentBuilder = waitSelect(castTranscriptPanel, "#content").then((content) => {
	      content.innerHTML = trustedPolicy.createHTML(`
	              <ytd-transcript-renderer class="style-scope ytd-engagement-panel-section-list-renderer" panel-content-visible="" panel-target-id="engagement-panel-searchable-transcript">
		      </ytd-transcrpt-renderer>
	      `);
	      
	      return waitSelect(content, "ytd-transcript-renderer");
	}).then((transcriptRenderer) => {
	      transcriptRenderer.innerHTML = trustedPolicy.createHTML(`
	      <!--css-build:shady--><!--css-build:shady--><div id="body" class="style-scope ytd-transcript-renderer"></div>
<div id="content" class="style-scope ytd-transcript-renderer"><ytd-transcript-search-panel-renderer class="style-scope ytd-transcript-renderer"><!--css-build:shady--><!--css-build:shady--><div id="header" class="style-scope ytd-transcript-search-panel-renderer"></div>
<div id="body" class="style-scope ytd-transcript-search-panel-renderer"><ytd-transcript-segment-list-renderer class="style-scope ytd-transcript-search-panel-renderer"><!--css-build:shady--><!--css-build:shady--><div id="segments-container" class="style-scope ytd-transcript-segment-list-renderer"><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 second -[ Sighs ]">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:01
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-[ Sighs ]</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer active" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="4 seconds Morning, Dwight.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:04
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Morning, Dwight.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container="" mouse-over=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="9 seconds -Who are you?">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:09
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Who are you?</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="10 seconds -[ Scoffs ]
Who am I? I'm Jim.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:10
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-[ Scoffs ]
Who am I? I'm Jim.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="13 seconds We've been working together
for 12 years.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:13
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">We've been working together
for 12 years.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="16 seconds Weird joke, Dwight.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:16
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Weird joke, Dwight.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="17 seconds -You're not Jim.
Jim's not Asian.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:17
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-You're not Jim.
Jim's not Asian.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="20 seconds -You seriously never noticed?">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:20
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-You seriously never noticed?</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="21 seconds Hey. Hats off to you
for not seeing race.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:21
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Hey. Hats off to you
for not seeing race.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="26 seconds -All right, then, Jim.
Uh, why don't you tell me">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:26
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-All right, then, Jim.
Uh, why don't you tell me</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="29 seconds about that sale
that you made yesterday?">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:29
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">about that sale
that you made yesterday?</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="32 seconds -Uh, Wellington Systems?">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:32
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Uh, Wellington Systems?</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="34 seconds Sold them 10 cases
of 24-pound letter stock.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:34
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Sold them 10 cases
of 24-pound letter stock.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="36 seconds Or were you talking about
Krieger-Murphy?">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:36
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Or were you talking about
Krieger-Murphy?</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="38 seconds Because I didn't
close that one yet,">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:38
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Because I didn't
close that one yet,</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="40 seconds but I'm hoping I've got
a voicemail from Paul Krieger">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:40
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">but I'm hoping I've got
a voicemail from Paul Krieger</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="42 seconds waiting for me.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:42
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">waiting for me.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="45 seconds -Please enter your password.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:45
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Please enter your password.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="52 seconds You have one new message.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:52
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">You have one new message.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="54 seconds -How did you know? No! No, no.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:54
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-How did you know? No! No, no.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="57 seconds That is sensitive information.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:57
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">That is sensitive information.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="58 seconds Only for employees,
not outsiders!">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      0:58
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Only for employees,
not outsiders!</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute -Dwight, cut it out.
I'm trying to work.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:00
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Dwight, cut it out.
I'm trying to work.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 2 seconds -You don't work here!
You're not Jim!">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:02
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-You don't work here!
You're not Jim!</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 3 seconds -Jim, I got us that dinner
reservation -- Grico's, 7:30.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:03
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Jim, I got us that dinner
reservation -- Grico's, 7:30.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 7 seconds -Oh, great. Can't wait.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:07
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-Oh, great. Can't wait.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 11 seconds Jim's at the dentist
this morning,">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:11
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Jim's at the dentist
this morning,</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 13 seconds and Steve is
an actor friend of ours.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:13
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">and Steve is
an actor friend of ours.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 15 seconds -I don't know who you are,
but you are not Jim.">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:15
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">-I don't know who you are,
but you are not Jim.</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 19 seconds This is Jim!">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:19
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">This is Jim!</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 26 seconds Oh, my --">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:26
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Oh, my --</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer><ytd-transcript-segment-renderer class="style-scope ytd-transcript-segment-list-renderer" rounded-container=""><!--css-build:shady--><!--css-build:shady--><div class="segment style-scope ytd-transcript-segment-renderer" role="button" tabindex="0" aria-label="1 minute, 28 seconds Oh, d-- Oh, how did -- Hunh!">
  <div class="segment-start-offset style-scope ytd-transcript-segment-renderer" tabindex="-1" aria-hidden="true">
    <div class="segment-timestamp style-scope ytd-transcript-segment-renderer">
      1:28
    </div>
  </div>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
  <yt-formatted-string class="segment-text style-scope ytd-transcript-segment-renderer" aria-hidden="true" tabindex="-1">Oh, d-- Oh, how did -- Hunh!</yt-formatted-string>
  <dom-if restamp="" class="style-scope ytd-transcript-segment-renderer"><template is="dom-if"></template></dom-if>
</div>
</ytd-transcript-segment-renderer></div>
<div id="message-container" class="style-scope ytd-transcript-segment-list-renderer" hidden="">
  <yt-formatted-string id="no-results" class="style-scope ytd-transcript-segment-list-renderer">No results found</yt-formatted-string>
</div></ytd-transcript-segment-list-renderer></div>
<div id="error-container" class="style-scope ytd-transcript-search-panel-renderer" hidden="">
  <tp-yt-paper-button id="retry-button" class="style-scope ytd-transcript-search-panel-renderer" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false"><!--css-build:shady--><!--css-build:shady-->
    <yt-formatted-string class="style-scope ytd-transcript-search-panel-renderer">TAP TO RETRY</yt-formatted-string>
  
</tp-yt-paper-button>
</div>
<div class="spinner-container style-scope ytd-transcript-search-panel-renderer" hidden="">
  <tp-yt-paper-spinner class="style-scope ytd-transcript-search-panel-renderer" aria-hidden="true" aria-label="loading"><!--css-build:shady--><!--css-build:shady--><div id="spinnerContainer" class="  style-scope tp-yt-paper-spinner">
  <div class="spinner-layer layer-1 style-scope tp-yt-paper-spinner">
    <div class="circle-clipper left style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
    <div class="circle-clipper right style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
  </div>

  <div class="spinner-layer layer-2 style-scope tp-yt-paper-spinner">
    <div class="circle-clipper left style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
    <div class="circle-clipper right style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
  </div>

  <div class="spinner-layer layer-3 style-scope tp-yt-paper-spinner">
    <div class="circle-clipper left style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
    <div class="circle-clipper right style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
  </div>

  <div class="spinner-layer layer-4 style-scope tp-yt-paper-spinner">
    <div class="circle-clipper left style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
    <div class="circle-clipper right style-scope tp-yt-paper-spinner">
      <div class="circle style-scope tp-yt-paper-spinner"></div>
    </div>
  </div>
</div>
</tp-yt-paper-spinner>
</div>
<div id="footer" class="style-scope ytd-transcript-search-panel-renderer"><ytd-transcript-footer-renderer class="style-scope ytd-transcript-search-panel-renderer"><!--css-build:shady--><!--css-build:shady--><div id="menu" class="style-scope ytd-transcript-footer-renderer"><yt-sort-filter-sub-menu-renderer class="style-scope ytd-transcript-footer-renderer"><!--css-build:shady--><!--css-build:shady--><tp-yt-paper-tooltip class="style-scope yt-sort-filter-sub-menu-renderer" role="tooltip" tabindex="-1" aria-label="tooltip"><!--css-build:shady--><!--css-build:shady--><div id="tooltip" class="hidden style-scope tp-yt-paper-tooltip" style-target="tooltip">
  
</div>
</tp-yt-paper-tooltip>
<yt-dropdown-menu class="style-scope yt-sort-filter-sub-menu-renderer has-items" modern-buttons=""><!--css-build:shady--><!--css-build:shady--><tp-yt-paper-menu-button dynamic-align="" expand-sizing-target-for-scrollbars="" class="style-scope yt-dropdown-menu" role="group" aria-haspopup="true" horizontal-align="left" vertical-align="top" aria-disabled="false"><!--css-build:shady--><!--css-build:shady--><div id="trigger" class="style-scope tp-yt-paper-menu-button">
  <tp-yt-paper-button id="label" class="dropdown-trigger style-scope yt-dropdown-menu" slot="dropdown-trigger" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false" aria-expanded="false"><!--css-build:shady--><!--css-build:shady-->
    <dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>
    
      <div id="label-text" style-target="label-text" class="style-scope yt-dropdown-menu">English</div>
      <yt-icon id="label-icon" icon="expand" class="style-scope yt-dropdown-menu"><!--css-build:shady--><!--css-build:shady--><span class="yt-icon-shape style-scope yt-icon yt-spec-icon-shape"><div style="width: 100%; height: 100%; display: block; fill: currentcolor;"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg></div></span></yt-icon>
    <dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>
  
</tp-yt-paper-button>
</div>

<tp-yt-iron-dropdown id="dropdown" class="style-scope tp-yt-paper-menu-button" horizontal-align="left" vertical-align="top" aria-disabled="false" aria-hidden="true" style="outline: none; display: none;"><!--css-build:shady--><!--css-build:shady--><div id="contentWrapper" class="style-scope tp-yt-iron-dropdown">
  <div slot="dropdown-content" class="dropdown-content style-scope tp-yt-paper-menu-button">
    <tp-yt-paper-listbox id="menu" class="dropdown-content style-scope yt-dropdown-menu" slot="dropdown-content" role="listbox" tabindex="0"><!--css-build:shady--><!--css-build:shady-->
    
      <a class="yt-simple-endpoint style-scope yt-dropdown-menu iron-selected" aria-selected="true" tabindex="0">
        <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false"><!--css-build:shady--><!--css-build:shady-->
          <tp-yt-paper-item-body class="style-scope yt-dropdown-menu"><!--css-build:shady--><!--css-build:shady-->
            <div id="item-with-badge" class="style-scope yt-dropdown-menu">
              <div class="item style-scope yt-dropdown-menu">English
                <span class="notification style-scope yt-dropdown-menu" hidden=""></span>
              </div>
              <ytd-badge-supported-renderer class="style-scope yt-dropdown-menu" disable-upgrade="" hidden="">
              </ytd-badge-supported-renderer>
            </div>
            <div secondary="" id="subtitle" class="style-scope yt-dropdown-menu" hidden="">
              
            </div>
          
</tp-yt-paper-item-body>
          <yt-reload-continuation class="style-scope yt-dropdown-menu">
          </yt-reload-continuation>
        
</tp-yt-paper-item>
      </a>
    
      <a class="yt-simple-endpoint style-scope yt-dropdown-menu" tabindex="-1" aria-selected="false">
        <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false"><!--css-build:shady--><!--css-build:shady-->
          <tp-yt-paper-item-body class="style-scope yt-dropdown-menu"><!--css-build:shady--><!--css-build:shady-->
            <div id="item-with-badge" class="style-scope yt-dropdown-menu">
              <div class="item style-scope yt-dropdown-menu">English (auto-generated)
                <span class="notification style-scope yt-dropdown-menu" hidden=""></span>
              </div>
              <ytd-badge-supported-renderer class="style-scope yt-dropdown-menu" disable-upgrade="" hidden="">
              </ytd-badge-supported-renderer>
            </div>
            <div secondary="" id="subtitle" class="style-scope yt-dropdown-menu" hidden="">
              
            </div>
          
</tp-yt-paper-item-body>
          <yt-reload-continuation class="style-scope yt-dropdown-menu">
          </yt-reload-continuation>
        
</tp-yt-paper-item>
      </a>
    <dom-repeat id="repeat" class="style-scope yt-dropdown-menu"><template is="dom-repeat"></template></dom-repeat>
  
</tp-yt-paper-listbox>
  </div>
</div>
</tp-yt-iron-dropdown>
</tp-yt-paper-menu-button>
</yt-dropdown-menu>
<div id="notification" class="style-scope yt-sort-filter-sub-menu-renderer" hidden=""></div>
	      `);
	});

	await headerBuilder;
	await contentBuilder;

	castTranscriptPanel.setAttribute("status", "initialized");
	return castTranscriptPanel;
}

const buildCastTranscriptPanel2 = async (transcriptPanel: HTMLElement) => {
	// Create cast transcript panel
	const castTranscriptPanel = transcriptPanel.cloneNode(true);
	transcriptPanel.after(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties
	castTranscriptPanel.setAttribute("target-id", "engagement-panel-cast-transcript");
	castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
	castTranscriptPanel.setAttribute("status", "initializing");
	castTranscriptPanel.style.visibility = "";
	castTranscriptPanel.style.order = "-5";


	let castTranscriptTitle = null;
	let castCloseButtonRenderer = null;
	const titleBuilder = waitSelect(transcriptPanel, "ytd-engagement-panel-title-header-renderer").then((titleMetadata) => {
	      const transcriptTitle = titleMetadata.result;
	      castTranscriptTitle = transcriptTitle.cloneNode(true);
	      castTranscriptPanel.children[0].appendChild(castTranscriptTitle);  // NOTE: node has to be added first before we can modify its properties
	      castTranscriptTitle.querySelector("#title-text").textContent = "Casted Transcript";
	      castTranscriptTitle.querySelector("#icon").style.width = "0px";

	      return waitSelect(transcriptTitle, "#visibility-button ytd-button-renderer");
	}).then((closeButtonRendererMetadata) => {
	      const closeButtonRenderer = closeButtonRendererMetadata.result;
	      castCloseButtonRenderer = closeButtonRenderer.cloneNode(true);
	      castTranscriptTitle.children[2].children[6].appendChild(castCloseButtonRenderer);  // NOTE: node has to be added first before we can modify its properties
	      
	      return waitSelect(closeButtonRenderer, "button[aria-label='Close transcript']");
	}).then((buttonMetadata) => {
	      const button = buttonMetadata.result;
	      const castButton = button.cloneNode(true);
	      castCloseButtonRenderer.children[0].appendChild(castButton);

	      return waitSelect(castButton, "yt-touch-feedback-shape");
	});

	let castTranscriptContent = null;
	let castTranscriptBody = null;
	const contentBuilder = waitSelect(transcriptPanel, "ytd-transcript-renderer").then((contentMetadata) => {
	      const transcriptContent = contentMetadata.result;
	      castTranscriptContent = transcriptContent.cloneNode(true);
	      castTranscriptPanel.children[1].appendChild(castTranscriptContent);  // NOTE: node has to be added first before we can modify its properties

	      return waitSelect(transcriptContent, "ytd-transcript-search-panel-renderer");
	}).then((transcriptBodyMetadata) => {
	      const transcriptBody = transcriptBodyMetadata.result;
	      castTranscriptBody = transcriptBody.cloneNode(true);
	      castTranscriptContent.children[1].appendChild(castTranscriptBody);  // NOTE: node has to be added first before we can modify its properties

	      return waitSelect(transcriptBody, "ytd-transcript-segment-list-renderer");
	}).then((transcriptSegmentsMetadata) => {
	      const transcriptSegments = transcriptSegmentsMetadata.result;
	      const castTranscriptSegments = transcriptSegments.cloneNode(true);
	      castTranscriptBody.children[1].appendChild(castTranscriptSegments);  // NOTE: node has to be added first before we can modify its properties
	});

	await titleBuilder;
	await contentBuilder;
	
	castTranscriptPanel.setAttribute("status", "initialized");
	return castTranscriptPanel;
}

const populateCastTranscript = (segmentsContainer: HTMLElement) => {
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

export const castTranscriptButtonClickerListener = () => {
	Object.keys(id_2_waitSelectMetadata).forEach((id) => Object.keys(id_2_waitSelectMetadata[id]).forEach((prop) => console.log(`${prop} => ${id_2_waitSelectMetadata[id][prop]}`)));
        loadCastTranscriptPanel().then(castTranscriptPanel => castTranscriptPanel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"));
	console.log("waitSelectMetadata:");
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

const newJobRe = new RegExp("<!--\\s*yte.waitCreateHTML.startFragment=`([^`]*)`\\s*-->(.*)<!--\\s*yte.waitCreateHTML.endFragment=`\\1`\\s*-->", "gs");
const waitCreateHTML = async (root: HTMLElement, html: string) => {
        console.log(`Entering waitCreateHTML with root=${root.tagName} ${root.classList}`);
	
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
	    
	    console.log(`waitCreateHTML found match at startIdx=${startIdx} with selector=${selector}`);
	}
	truncatedHTML += html.substring(prevEndIdx);
	
        console.log(`waitCreateHTML with root=${root.tagName} ${root.classList}: found fragments: ${Object.keys(selector_to_job)}}`);

	root.innerHTML = trustedPolicy.createHTML(truncatedHTML);

	for (const [selector, job] of Object.entries(selector_to_job)) {
	    job.asyncToWait = waitSelect(root, job.selector).then((targetNode) => {waitCreateHTML(targetNode, job.fragment)});
	}

        console.log(`waitCreateHTML with root=${root.tagName} ${root.classList}: asyncs initiated`);

	for (const [selector, job] of Object.entries(selector_to_job)) {
	    await job.asyncToWait;
	}

        console.log(`waitCreateHTML with root=${root.tagName} ${root.classList}: asyncs done`);
	
	return root;
}