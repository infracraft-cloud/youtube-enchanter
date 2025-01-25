import type { AddButtonFunction, RemoveButtonFunction } from "@/src/features";

import { addFeatureButton, removeFeatureButton } from "@/src/features/buttonPlacement";
import { getFeatureIcon } from "@/src/icons";
import eventManager from "@/src/utils/EventManager";
import { id_2_waitSelectMetadata, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import { DEBUG, debug, browserColorLog, createStyledElement, waitSelect } from "@/src/utils/utilities";
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
		    return buildCastTranscriptPanel(panels).then((castTranscriptPanel) => {		    
			  // Launch a new promise chain, since loading the transcript segments requires an API call and can take a very long time
			  castTranscript(castTranscriptPanel).then(() => {
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
	const placeholder = createStyledElement({
		elementType: "div",
	});
	placeholder.innerHTML = trustedPolicy.createHTML(`
	      <ytd-engagement-panel-section-list-renderer class="style-scope ytd-watch-flexy" modern-panels="" enable-anchored-panel="" disable-backdrop-filter="" target-id="engagement-panel-cast-transcript" visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED" style="order: -5;" status="initializing">
	      </ytd-engagement-panel-section-list-renderer>
	`);
	const castTranscriptPanel = placeholder.children[0];
	panels.appendChild(castTranscriptPanel);  // NOTE: node has to be added first before we can modify its properties

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
				 Transcript
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
	     // For some reason due to dynamic scripts, we must set the text content of the title after we create all the elements,
	     // otherwise the scripts would modify the title to become empty.
	     castHeader.querySelector("#title-text").textContent = "Casted Transcript";



             // Add event listeners for interactive buttons


	     // Close button
	     const closeButton = castHeader.querySelector("#visibility-button yt-button-shape");
	     registerClickOutListener([closeButton], (withinBoundaries) => {if (withinBoundaries) setCastTranscriptPanelVisibility(false, castTranscriptPanel);});
	});
	
	const contentBuilder = waitCreateHTML(castTranscriptPanel.querySelector("#content"),  `
	     <ytd-transcript-renderer class="style-scope ytd-engagement-panel-section-list-renderer" panel-content-visible="" panel-target-id="engagement-panel-searchable-transcript">
		 <!--css-build:shady-->
		 <!--css-build:shady-->
		 <div id="body" class="style-scope ytd-transcript-renderer"></div>
		 <div id="content" class="style-scope ytd-transcript-renderer">
		     <ytd-transcript-search-panel-renderer class="style-scope ytd-transcript-renderer">
		         <!--css-build:shady-->
			 <!--css-build:shady-->
			 <div id="header" class="style-scope ytd-transcript-search-panel-renderer"></div>
		         <div id="body" class="style-scope ytd-transcript-search-panel-renderer">
			     <ytd-transcript-segment-list-renderer class="style-scope ytd-transcript-search-panel-renderer">
			         <!--css-build:shady-->
				 <!--css-build:shady-->
				 <div id="segments-container" class="style-scope ytd-transcript-segment-list-renderer"></div>
		                 <div id="message-container" class="style-scope ytd-transcript-segment-list-renderer" hidden="">
		                     <yt-formatted-string id="no-results" class="style-scope ytd-transcript-segment-list-renderer">No results found</yt-formatted-string>
		                 </div>
		            </ytd-transcript-segment-list-renderer>
			</div>
		        <div id="error-container" class="style-scope ytd-transcript-search-panel-renderer" hidden="">
		            <tp-yt-paper-button id="retry-button" class="style-scope ytd-transcript-search-panel-renderer" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false">
			        <!--css-build:shady-->
				<!--css-build:shady-->
		                <yt-formatted-string class="style-scope ytd-transcript-search-panel-renderer">TAP TO RETRY</yt-formatted-string>
 		            </tp-yt-paper-button>
		        </div>
			<div id="footer" class="style-scope ytd-transcript-search-panel-renderer">
			    <ytd-transcript-footer-renderer class="style-scope ytd-transcript-search-panel-renderer">
			        <!--css-build:shady-->
				<!--css-build:shady-->
				<div id="menu" class="style-scope ytd-transcript-footer-renderer">
				    <yt-sort-filter-sub-menu-renderer class="style-scope ytd-transcript-footer-renderer">
				        <!--css-build:shady-->
					<!--css-build:shady-->
					<tp-yt-paper-tooltip class="style-scope yt-sort-filter-sub-menu-renderer" role="tooltip" tabindex="-1" aria-label="tooltip">
					    <!--css-build:shady-->
					    <!--css-build:shady-->
					    <div id="tooltip" class="hidden style-scope tp-yt-paper-tooltip" style-target="tooltip"></div>
					</tp-yt-paper-tooltip>
					<yt-dropdown-menu class="style-scope yt-sort-filter-sub-menu-renderer has-items" modern-buttons="">
					    <!--css-build:shady-->
					    <!--css-build:shady-->
					    <tp-yt-paper-menu-button dynamic-align="" expand-sizing-target-for-scrollbars="" class="style-scope yt-dropdown-menu" role="group" aria-haspopup="true" horizontal-align="left" vertical-align="top" aria-disabled="false">
  				                <!--yte.waitCreateHTML.startFragment=\`#footer #menu tp-yt-paper-menu-button\`-->
					        <!--css-build:shady-->
						<!--css-build:shady-->







						<div id="trigger" class="style-scope tp-yt-paper-menu-button">
						    <tp-yt-paper-button id="label" class="dropdown-trigger style-scope yt-dropdown-menu" slot="dropdown-trigger" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false" aria-expanded="false">
						        <!--css-build:shady-->
							<!--css-build:shady-->
							<dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>
							<div id="label-text" style-target="label-text" class="style-scope yt-dropdown-menu">Original</div>
							<yt-icon id="label-icon" icon="expand" class="style-scope yt-dropdown-menu">
							    <!--css-build:shady-->
							    <!--css-build:shady-->
							    <span class="yt-icon-shape style-scope yt-icon yt-spec-icon-shape">
							        <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
								    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg>
								</div>
						            </span>
							</yt-icon>
						        <dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>

							<tp-yt-paper-ripple class="style-scope tp-yt-paper-button">
							    <!--css-build:shady-->
							    <!--css-build:shady-->
							    <div id="background" class="style-scope tp-yt-paper-ripple"></div>
							    <div id="waves" class="style-scope tp-yt-paper-ripple"></div>
							</tp-yt-paper-ripple>
						    </tp-yt-paper-button>
						</div>






						<tp-yt-iron-dropdown id="dropdown" class="style-scope tp-yt-paper-menu-button" horizontal-align="left" vertical-align="top" aria-disabled="false" aria-hidden="true" style="outline: none; display: none;">
     				                    <!--yte.waitCreateHTML.startFragment=\`tp-yt-iron-dropdown\`-->
						    <!--css-build:shady-->
						    <!--css-build:shady-->
						    <div id="contentWrapper" class="style-scope tp-yt-iron-dropdown">
							<div slot="dropdown-content" class="dropdown-content style-scope tp-yt-paper-menu-button">
							    <tp-yt-paper-listbox id="menu" class="dropdown-content style-scope yt-dropdown-menu" slot="dropdown-content" role="listbox" tabindex="0">
     				                                <!--yte.waitCreateHTML.startFragment=\`#menu\`-->
							        <!--css-build:shady-->
								<!--css-build:shady-->





								<a class="yt-simple-endpoint style-scope yt-dropdown-menu iron-selected" aria-selected="true" tabindex="0">
 								    <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false">
								        <!--css-build:shady-->
									<!--css-build:shady-->
									<tp-yt-paper-item-body class="style-scope yt-dropdown-menu">
									    <!--css-build:shady-->
									    <!--css-build:shady-->
									    <div id="item-with-badge" class="style-scope yt-dropdown-menu">
										<div class="item style-scope yt-dropdown-menu">
										    Original
										    <span class="notification style-scope yt-dropdown-menu" hidden=""></span>
										</div>
										<ytd-badge-supported-renderer class="style-scope yt-dropdown-menu" disable-upgrade="" hidden=""></ytd-badge-supported-renderer>
									    </div>
									    <div secondary="" id="subtitle" class="style-scope yt-dropdown-menu" hidden=""></div>
									</tp-yt-paper-item-body>
								        <yt-reload-continuation class="style-scope yt-dropdown-menu"></yt-reload-continuation>
								    </tp-yt-paper-item>
						                </a>

								<a class="yt-simple-endpoint style-scope yt-dropdown-menu" tabindex="-1" aria-selected="false">
								    <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false">
								        <!--css-build:shady-->
									<!--css-build:shady-->
								        <tp-yt-paper-item-body class="style-scope yt-dropdown-menu">
									    <!--css-build:shady-->
									    <!--css-build:shady-->
									    <div id="item-with-badge" class="style-scope yt-dropdown-menu">
									        <div class="item style-scope yt-dropdown-menu">
										    English
										    <span class="notification style-scope yt-dropdown-menu" hidden=""></span>
									        </div>
									        <ytd-badge-supported-renderer class="style-scope yt-dropdown-menu" disable-upgrade="" hidden=""></ytd-badge-supported-renderer>
									    </div>
									    <div secondary="" id="subtitle" class="style-scope yt-dropdown-menu" hidden=""></div>
								        </tp-yt-paper-item-body>
								        <yt-reload-continuation class="style-scope yt-dropdown-menu"></yt-reload-continuation>
								    </tp-yt-paper-item>
								</a>





								<dom-repeat id="repeat" class="style-scope yt-dropdown-menu"><template is="dom-repeat"></template></dom-repeat>
     				                                <!--yte.waitCreateHTML.endFragment=\`#menu\`-->
 							    </tp-yt-paper-listbox>
						        </div>
						    </div>
     				                    <!--yte.waitCreateHTML.endFragment=\`tp-yt-iron-dropdown\`-->
						</tp-yt-iron-dropdown>


  				                <!--yte.waitCreateHTML.endFragment=\`#footer #menu tp-yt-paper-menu-button\`-->



					    </tp-yt-paper-menu-button>
					</yt-dropdown-menu>
					<div id="notification" class="style-scope yt-sort-filter-sub-menu-renderer" hidden=""></div>
				    </yt-sort-filter-sub-menu-renderer>
			        </div>
			    </ytd-transcript-footer-renderer>
			</div>
                     </ytd-transcript-search-panel-renderer>
		 </div>
		 <div id="footer" class="style-scope ytd-transcript-renderer"></div>
	     </ytd-transcrpt-renderer>
	`).then((castContent) => {
             // Add event listeners for interactive buttons


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
	});

	// await headerBuilder;
	await contentBuilder;

	castTranscriptPanel.setAttribute("status", "initialized");
	return castTranscriptPanel;
}

const castTranscript = (castTranscriptPanel: HTMLElement) => {
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
	console.log("TEST");
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
	 
	if (visible) {
	     languageDropdownList.style = "outline: none; position: fixed; left: 40.8px; top: 170.4px; z-index: 2202;";
	     // languageDropdownList.setAttribute("focused", "")
	     languageDropdownList.removeAttribute("aria-hidden");
	     if (activeOption) activeOption.focus();
	} else {
	     languageDropdownList.style = "outline: none; position: fixed; left: 40.8px; top: 170.4px; z-index: 2202; display: none;";
	     // languageDropdownList.removeAttribute("focused");
	     languageDropdownList.setAttribute("aria-hidden", "true");
	     if (activeOption) activeOption.blur();
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