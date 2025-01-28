
import { createElement, waitSetInnerHTML } from "./utils";

import { DROPDOWN_MENU_HTML } from "./constants";


interface Option {
       id: string;
       text: string;
}

export const buildMenuWithTextTrigger = async (triggerText: string, menuOptions: Option[], menuContainer: HTMLElement) => {
	await waitSetInnerHTML(menuContainer, DROPDOWN_MENU_HTML);
	
	const triggerContainer = menuContainer.querySelector("#footer #menu #trigger");
	const menuOptionsContainer = menuContainer.querySelector("#footer #menu #dropdown #menu");

	await Promise.allSettled([buildMenuTextTrigger(triggerText, triggerContainer), buildMenuOptions(menuOptions, menuOptionsContainer)])
	return
}

const buildMenuTextTrigger = async (text: string, triggerContainer: HTMLElement) => {
       let triggerHTML = `
						    <tp-yt-paper-button id="label" class="dropdown-trigger style-scope yt-dropdown-menu" slot="dropdown-trigger" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false" aria-expanded="false">
						        <!--css-build:shady-->
							<!--css-build:shady-->
							<dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>
							<div id="label-text" style-target="label-text" class="style-scope yt-dropdown-menu">${text}</div>
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
						    </tp-yt-paper-button>`;

	return waitSetInnerHTML(triggerContainer, triggerHTML);
}

const buildMenuOptions = async (options: Option[], menuOptionsContainer: HTMLElement) => {
       let optionsHTML = `
							        <!--css-build:shady-->
								<!--css-build:shady-->`;
       

       for (const option of options) {
       	     optionsHTML += `
								<a class="yt-simple-endpoint style-scope yt-dropdown-menu iron-selected" aria-selected="true" tabindex="0" id="${option.id}">
 								    <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false">
								        <!--css-build:shady-->
									<!--css-build:shady-->
									<tp-yt-paper-item-body class="style-scope yt-dropdown-menu">
									    <!--css-build:shady-->
									    <!--css-build:shady-->
									    <div id="item-with-badge" class="style-scope yt-dropdown-menu">
										<div class="item style-scope yt-dropdown-menu">
										    ${option.text}
										    <span class="notification style-scope yt-dropdown-menu" hidden=""></span>
										</div>
										<ytd-badge-supported-renderer class="style-scope yt-dropdown-menu" disable-upgrade="" hidden=""></ytd-badge-supported-renderer>
									    </div>
									    <div secondary="" id="subtitle" class="style-scope yt-dropdown-menu" hidden=""></div>
									</tp-yt-paper-item-body>
								        <yt-reload-continuation class="style-scope yt-dropdown-menu"></yt-reload-continuation>
								    </tp-yt-paper-item>
						                </a>`;
       }

       optionsHTML += `
								<dom-repeat id="repeat" class="style-scope yt-dropdown-menu"><template is="dom-repeat"></template></dom-repeat>`;


       return waitSetInnerHTML(menuOptionsContainer, optionsHTML);
}

