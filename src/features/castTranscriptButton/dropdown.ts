
import { createElement, removeGlobalClickListener, listenAttributeMutation, listenAttributePressed, waitSetInnerHTML, registerGlobalClickListener } from "./utils";

import { DROPDOWN_HTML } from "./constants";


interface DropdownOption {
       id: string;
       text: string;
       isInitiallySelected: boolean;
       triggerText?: string;
};

interface DropdownSettings {
       // All of these flags are boolean and default to false
       keepTriggerTextConstant: boolean;
       setInitialTriggerTextAsInitialSelectedOption: boolean;
       disableHighlightingSelectedOption: boolean;
};

export const buildDropdownWithTextTrigger = async (initialTriggerText: string, dropdownOptions: DropdownOption[], dropdownContainer: HTMLElement, settings : DropdownSettings = {}, onTriggerChange: (newOptionId: string, newText: string) => void) => {
	await waitSetInnerHTML(dropdownContainer, DROPDOWN_HTML);
	
	const triggerContainer = dropdownContainer.querySelector("#trigger");
	const dropdownOptionsContainer = dropdownContainer.querySelector("#dropdown #menu");

	await Promise.allSettled([buildDropdownTextTrigger(triggerContainer), buildDropdownOptions(dropdownOptions, dropdownOptionsContainer, settings)])

	let triggerTextIsEmpty = true;
	if (settings && settings.setInitialTriggerTextAsInitialSelectedOption) {
	        const firstActiveOption = dropdownOptions.find(option => option.isInitiallySelected);
	        if (firstActiveOption) {
		        setTriggerText(firstActiveOption.triggerText ? firstActiveOption.triggerText : firstActiveOption.text, firstActiveOption.id, triggerContainer);
			triggerTextIsEmpty = false;
		}
	}

        if (triggerTextIsEmpty) setTriggerText(initialTriggerText, "", triggerContainer);
	
	attachPermanentDropdownListeners(dropdownContainer, settings, onTriggerChange);
}

export const enableDropdownListeners = (dropdownContainer: HTMLElement) => {
	const trigger = dropdownContainer.querySelector("tp-yt-paper-button#label");
	if (!trigger) throw new Error("enableDropdownListeners() error: cannot find dropdownContainer trigger");
	const optionsDropdown = dropdownContainer.querySelector("tp-yt-iron-dropdown#dropdown");
	if (!optionsDropdown) throw new Error("enableDropdownListeners() error: cannot find dropdownContainer optionsDropdown");
	
	registerGlobalClickListener([trigger, optionsDropdown], (withinBoundaries) => {if (!withinBoundaries) setDropdownVisibility(false, optionsDropdown);});
}

export const disableDropdownListeners = (dropdownContainer: HTMLElement) => {
	const trigger = dropdownContainer.querySelector("tp-yt-paper-button#label");
	if (!trigger) throw new Error("enableDropdownListeners() error: cannot find dropdownContainer trigger");
	const optionsDropdown = dropdownContainer.querySelector("tp-yt-iron-dropdown#dropdown");
	if (!optionsDropdown) throw new Error("enableDropdownListeners() error: cannot find dropdownContainer optionsDropdown");

	removeGlobalClickListener([trigger, optionsDropdown]);
}

const buildDropdownTextTrigger = async (triggerContainer: HTMLElement) => {
       let triggerHTML = `
						    <tp-yt-paper-button id="label" class="dropdown-trigger style-scope yt-dropdown-menu" slot="dropdown-trigger" style-target="host" role="button" tabindex="0" animated="" elevation="0" aria-disabled="false" aria-expanded="false">
						        <!--css-build:shady-->
							<!--css-build:shady-->
							<dom-if class="style-scope yt-dropdown-menu"><template is="dom-if"></template></dom-if>
							<div id="label-text" style-target="label-text" class="style-scope yt-dropdown-menu">
							</div>
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

const buildDropdownOptions = async (options: DropdownOption[], dropdownOptionsContainer: HTMLElement, settings : DropdownSettings) => {
       let optionsHTML = `
							        <!--css-build:shady-->
								<!--css-build:shady-->`;
       

       for (const option of options) {
       	     optionsHTML += `
								<a class="yt-simple-endpoint style-scope yt-dropdown-menu${option.isInitiallySelected && !(settings.disableHighlightingSelectedOption) ? " iron-selected" : ""}" aria-selected="true" tabindex="0">
 								    <tp-yt-paper-item class="style-scope yt-dropdown-menu" style-target="host" role="option" tabindex="0" aria-disabled="false" option-id="${option.id}" ${option.triggerText ? ` trigger-text="` + option.triggerText + `"` : ""}>
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


       return waitSetInnerHTML(dropdownOptionsContainer, optionsHTML);
}

const attachPermanentDropdownListeners = (dropdownContainer: HTMLElement, settings: DropdownSettings, onTriggerChange: (newOptionId: string, newText: string) => void) => {
	const trigger = dropdownContainer.querySelector("#trigger");
	if (!trigger) throw new Error("attachPermanentDropdownListeners() error: cannot find dropdownContainer trigger");
	const triggerPresser = trigger.querySelector("tp-yt-paper-button#label");
	if (!triggerPresser) throw new Error("attachPermanentDropdownListeners() error: cannot find dropdownContainer triggerPresser");
	const optionsDropdown = dropdownContainer.querySelector("tp-yt-iron-dropdown#dropdown");
	if (!optionsDropdown) throw new Error("attachPermanentDropdownListeners() error: cannot find dropdownContainer optionsDropdown");
	const options = dropdownContainer.querySelectorAll("#dropdown tp-yt-paper-item[role=option]");
	if (!options) throw new Error("attachPermanentDropdownListeners() error: cannot find dropdownContainer options");
	
	for (const option of options) {
	    listenAttributePressed(option, (mutation) => {
	         if (!settings.disableHighlightingSelectedOption || !settings.keepTriggerTextConstant) {
		     for (const curr of options) {
			 if (curr.isSameNode(mutation.target)) {
			       if (!settings.disableHighlightingSelectedOption) curr.parentNode.classList.add("iron-selected");

			       if (!settings.keepTriggerTextConstant) setTriggerTextFromOption(curr, trigger);
			 } else {
			       curr.parentNode.classList.remove("iron-selected");
			 }
		     }
		 }
		 setDropdownVisibility(false, optionsDropdown);
	    });
	}

	listenAttributePressed(triggerPresser, (mutation) => {setDropdownVisibility(true, optionsDropdown);});
	listenAttributeMutation(trigger, "option-id", (mutation, observer) => {
	    onTriggerChange(mutation.target.getAttribute("option-id"), mutation.target.getAttribute("trigger-text"));
	})
}

const setTriggerTextFromOption = (option: HTMLElement, trigger: HTMLElement) => {
	let newTriggerText = null;
	if (option.hasAttribute("trigger-text")) {
	     newTriggerText = option.getAttribute("trigger-text");
	} else {
	     newTriggerText = option.textContent.trim();
	}

	const newOptionId = option.getAttribute("option-id");

	setTriggerText(newTriggerText, newOptionId, trigger);
}

const setTriggerText = (newTriggerText: string, newOptionId: string, trigger: HTMLElement) => {
	const triggerText = trigger.querySelector("#label-text");
	if (!triggerText) throw new Error("setTriggerText() error: cannot find trigger triggerText");

	triggerText.textContent = newTriggerText;
	trigger.setAttribute("trigger-text", newTriggerText);
	trigger.setAttribute("option-id", newOptionId);
}


const setDropdownVisibility = (visible: boolean, dropdown: HTMLElement) => {
	const activeOption = dropdown.querySelector("a[class~=iron-selected] tp-yt-paper-item");
	const parentRect = dropdown.parentNode.getBoundingClientRect();
	 
	if (visible) {
	     dropdown.style = `outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202;`;
	     dropdown.removeAttribute("aria-hidden");
	     activeOption ? activeOption.focus() : dropdown.focus();

	     // Now that the dropdown has been rendered, we know its width/height, so check if it is spilling out of the viewport. If so, reposition it back in the viewport
	     const rect = dropdown.getBoundingClientRect();
	     const adjustX = Math.min(0, window.innerWidth - (rect.right + 20));
	     const adjustY = Math.min(0, window.innerHeight - (rect.bottom + 20));
	     dropdown.style = `outline: none; position: fixed; left: ${parentRect.left + adjustX}px; top: ${parentRect.top + adjustY}px; z-index: 2202;`;
	} else {
	     dropdown.style = "outline: none; position: fixed; left: ${parentRect.left}px; top: ${parentRect.top}px; z-index: 2202; display: none;";
	     dropdown.setAttribute("aria-hidden", "true");
	     activeOption ? activeOption.blur() : dropdown.blur();
	}
}
