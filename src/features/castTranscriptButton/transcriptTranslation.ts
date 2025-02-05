import { trustedPolicy} from "@/src/pages/embedded";
import { browserColorLog } from "@/src/utils/utilities";

import { createErrorToast, fetchTranslateApi } from "./utils";

interface Tnote {
	indexes: number[][];
	translation: str;
	
	subnotes: TNote[];
};

interface Translation {
	sourceLang: str;
	targetLang: str;

	query: str;  // NOTE: this is the query that the API server computed the translation from
	fullTranslation: TNote;
};

interface LanguageAndPath {
      language: str;
      path: str;
}

// This variable is a private global variable that holds segment-related information. It should not be used or exported to any other source file,
// due to the fact that it is heavily utilized and mutated by this source file, and may become corrupted if so.
var segment_2_translations : Map<HTMLElement, Translation[]> = new Map<HTMLElement, Translation[]>()


export const loadTranslation = async (castTranscriptPanel, targetLang: string, sourceLang?: string) => {
     const segments = castTranscriptPanel.querySelectorAll("#segments-container #segment");
     if (!segments) throw new Error("loadTranslation() error: cannot find segments of castTranscriptPanel");
     
     removeAllTranslations();
     await downloadTranslationData(segments, targetLang, sourceLang);
     rebuildSegmentsWithTranslation()
     attachTranslationListeners();
}


// If 'languages' (or 'paths') is null or undefined, then we apply visibility to all languages (or paths).
// If 'languages' (or 'paths') is an empty list, then we apply visibility to no languages (or paths), i.e. we make all tnotes invisible.
export const displayTnotesByFilter = (languages: str[], paths: str[][]) => {
        if (!languages) languages = [null];
	if (!paths) paths = [null];
	
	for (const segment of segment_2_translations.keys()) {
	       const tnotePanel = segment.querySelector("#tnote-panel");
	       if (!tnotePanel) throw new Error("displayTnotesByFilter() error: cannot find tnotePanel of current segment");

	       const tnotesToDisplay = [];
	       for (const language of languages) {
		      for (const path of paths) {
			     const tnotes = segment.querySelectorAll(`#tnote${language ? `[language="${language}"]` : ""}${path ? `[path="${path}"]` : ""}`) ?? [];
			     tnotesToDisplay.push(...tnotes);
		      }
		}

	       displayTnotes(tnotesToDisplay, tnotePanel);
	}
}

export const displayTnotes = (tnotesToDisplay: HTMLElements[], tnotePanel: HTMLElement) => {
      const tnotesToDisplaySet = new Set(tnotesToDisplay);
      
      const tnotes = tnotePanel.querySelectorAll(`#tnote`);
      if (!tnotes) throw new Error(`displayTnotes() error: cannot find tnotes from tnotePanel`);
      
      for (const tnote of tnotes) {
          setTnoteVisibility(tnotesToDisplaySet.has(tnote), tnote);
      }
}

const setTnoteVisibility = (visible: boolean, tnote: HTMLElement) => {
      const language = tnote.getAttribute("language");
      const path = tnote.getAttribute("path");

      const segment = tnote.closest("#segment");
      if (!segment) throw new Error("setTnoteVisibility() error: could not find the parent #segment element of the tnote");

      const tnoteButtons = segment.querySelectorAll(`#tnote-button[language="${language}"][path="${path}"]`);

      if (visible) {
	  tnote.style.display = "";
	  if (tnoteButtons) tnoteButtons.forEach(tnoteButton => tnoteButton.style.backgroundColor = "coral");
      } else {
	  tnote.style.display = "none";
	  if (tnoteButtons) tnoteButtons.forEach(tnoteButton => tnoteButton.style.backgroundColor = "royalBlue");
      }
}


const removeAllTranslations = () => {
       for (const segment of segment_2_translations.keys()) {   
           const tnoteButtons = segment.querySelectorAll("#caption-content #tnote-button") ?? [];
	   tnoteButtons.forEach(elem => elem.onclick = null);
	      
	   const hideTnoteButtons = segment.querySelectorAll("#tnote-panel #hide-tnote-button") ?? [];
	   hideTnoteButtons.forEach(elem => elem.onclick = null);
       }
       
       segment_2_translations.clear();
}



// Initiates the API call to download data to populate the private global variable 'segment_2_translations' so that the other translation functions
// have the right data to work properly.
const downloadTranslationData = async (segments: HTMLElement[], targetLang: string, sourceLang?: string) => {
      for (const segment of segments) {
          const caption = segment.getAttribute("caption");
	  if (!caption) throw new Error(`downloadTranslationData() error: cannot find the caption for the corresponding segment`);
	  
          const postData = {
	  	 query: caption,
		 target_lang: targetLang
	  }
	  if (sourceLang) postData.source_lang = sourceLang;
	  
	  await fetchTranslateApi(postData).then(async (response) => {
		 if (response.status == 200) {
			return response.json();
		 } else {
			let json = {};
			try {
			      json = await response.json();
			} catch (error) {
			      throw new Error(`downloadTranslationData() error: fetch() returned an error with status ${response.status}: ${response.statusText}`);
			}
			throw new Error(`downloadTranslationData() error: fetch() returned an error with status ${response.status}: ${response.statusText} (response=${JSON.stringify(json)})`);
		 }
	  }).then(async (responseJson) => {
		 if (!segment_2_translations.has(segment)) segment_2_translations.set(segment, [])
		 
		 segment_2_translations.get(segment).push({sourceLang: responseJson.source_lang,
		                                           targetLang: responseJson.target_lang,
							   query: responseJson.query,
							   fullTranslation: responseJson.translation});
	  }).catch(async (error) => {
		 let publicErrorMsg = error.message;
		 let debugErrorMsg = error.message;
		 if (error.message.includes("Failed to fetch")) {
		       publicErrorMsg = "Failed to make network connection.";
		       debugErrorMsg = "loadTranslation() error: failed to make network connection. Please double check your internet connections, or if the servers are up.";
		 }

		 // Strip out the developer details in the UI
		 const responseIdx = publicErrorMsg.indexOf(" (response=");
		 if (responseIdx >= 0) {
		    publicErrorMsg = publicErrorMsg.substring(0, responseIdx);
		 }

		 browserColorLog(`${debugErrorMsg}: ${error}`, "FgRed");
		 createErrorToast(`Network request error: ${publicErrorMsg}`);
	  });
	  
	  // Wait 250ms between each call as to not overload the Google Translate API
	  await new Promise(res => {setTimeout(res, 250);});
      }
}




const rebuildSegmentsWithTranslation = () => {
        for (const [segment, translations] of segment_2_translations) {
	    const caption = segment.getAttribute("caption");
	    if (!caption) throw new Error("rebuildSegmentsWithTranslation() error: cannot find 'caption' attribute of segment");

	    const segmentContent = segment.querySelector("yt-formatted-string");
	    if (!segmentContent) throw new Error(`rebuildSegmentsWithTranslation() error: cannot find segmentContent ("yt-formatted-string") of segment`);
	    
	    let html = buildCaptionContentTableHTML(caption, translations);
	    html += buildTnotePanelHTML(translations);
	    segmentContent.innerHTML = trustedPolicy.createHTML(html);
	}
}

const buildCaptionContentTableHTML = (caption: string, translations: Translation[]) => {
	const captionSliceIdxs = getSliceIdxs(caption, translations);

        let captionPieces = []
	for (let i = 0; i < captionSliceIdxs.length - 1; i++) {
	    captionPieces.push(caption.substring(captionSliceIdxs[i], captionSliceIdxs[i+1]));
	}
	
	let html = `<table id="caption-content" style="border-spacing: 0; border-collapse: separate;">
			<tbody>
			    ${buildCaptionRowHTML(captionPieces)}`;

	for (const translation of translations) {
	    const depth_2_tnoteDatas = computeDepth2TnoteDatas(translation, captionSliceIdxs);
	    const maxDepth = Math.max(...Object.keys(depth_2_tnoteDatas));
	    for (let depth = 0; depth <= maxDepth; depth++) {
		if (depth > 0) html += `        <tr class="separator" style="height: 4px"></tr>`;

		const tnoteDatas = depth_2_tnoteDatas[depth] ?? [];
		html += buildTnoteButtonRowHTML(depth, captionPieces, translation, tnoteDatas);
	    }
	}

	html += `    </tbody>
		 </table>`;

        return html;
}

// sliceIdxs is guaranteed to be in ascending sorted order, with 0 and caption.length included
const getSliceIdxs = (caption: string, translations: Translations[]) => {
	const uniqueIdxs = new Set();
	uniqueIdxs.add(0);
	uniqueIdxs.add(caption.length);
	for (const translation of translations) {
	    recurseTnotes(translation.fullTranslation, (tnote, depth, path) => {
	    	for (const index of tnote.indexes) {
		    uniqueIdxs.add(index[0]);
		    uniqueIdxs.add(index[1]);
		}
            }, null);
	}

	const sliceIdxs = Array.from(uniqueIdxs);
	sliceIdxs.sort((a, b) => a - b);

	return sliceIdxs;
}

const buildCaptionRowHTML = (captionPieces: string[]) : string => {	
	let html = `        <tr language="original" depth="0">`;
	for (const captionPiece of captionPieces) {
	    html += `            <td id="caption" style="text-align: center; vertical-align: middle;">
				     ${captionPiece.replace(" ", "&nbsp;")}
				 </td>`;
	}
	html += `        </tr>`;
	return html;
}

interface TnoteButtonHTMLData {
        tnote: Tnote;
	tdStartIdx: number;    // The startIdx of the row of <td>'s that belong to this tnote button
	tdEndIdx: number;    // The endIdx (exclusive) of the row of <td>'s that belong to this tnote button
	path: number[];    // The unique identifier of this tnote given the translation
}

// tnote.indexes and captionSliceIdx are string indexes, so we must convert them
// to <td> indexes, as well as save the path information, before building the <tr>s
const computeDepth2TnoteDatas = (translation: Translation, captionSliceIdxs: number[]) : Map<number, TnoteButtonHTMLData[]> => {
	if (!translation.fullTranslation) throw new Error(`computeDepth2NodeTdIdxs() error: malformed translation data with missing .fullTranslation field: {translation}`);

	const depth_2_tnoteDatas = []
	recurseTnotes(translation.fullTranslation, (tnote, depth, path) => {	
	    if (!(depth in depth_2_tnoteDatas)) depth_2_tnoteDatas[depth] = [];
	    const tnoteDatas = depth_2_tnoteDatas[depth];

	    // tnote.indexes and captionSliceIdxs are string indexes
	    // We must convert these to <td> indexes
	    for (const index of tnote.indexes) {
		const tdStartIdx = captionSliceIdxs.findLastIndex(idx => idx <= index[0] );
		const tdEndIdx = captionSliceIdxs.findIndex(idx => idx >= index[1] );

		tnoteDatas.push({tnote: tnote, tdStartIdx: tdStartIdx, tdEndIdx: tdEndIdx, path: path});
	    }
	}, null);
	for (const [depth, tnoteDatas] of depth_2_tnoteDatas.entries()) {
	    tnoteDatas.sort((a, b) => a.tdStartIdx - b.tdStartIdx);
	}
	
	return depth_2_tnoteDatas;
}

const buildTnoteButtonRowHTML = (depth: number, captionPieces: string[], translation: Translation, tnoteDatas: TnoteButtonHTMLData[]) : string => {
	let html = `        <tr language="${translation.targetLang}" depth="${depth}" style="height: 4px;">`;

        if (tnoteDatas && tnoteDatas.length > 0) {
	    if (tnoteDatas[0].tdStartIdx > 0) {
		html += `<td colspan="${tnoteDatas[0].tdStartIdx}"></td>`;
	    }

	    let firstSeenTdStartIdx = null;
	    let lastSeenTdEndIdx = null;
	    let prevEndIdx = null;
	    for (const tnoteData of tnoteDatas) {
		if (prevEndIdx && prevEndIdx < tnoteData.tdStartIdx) {
		    html += `<td colspan="${tnoteData.tdStartIdx - prevEndIdx}"></td>`;
		}

		html += `<td id="tnote-button" language="${translation.targetLang}" path="${tnoteData.path.join('-')}" colspan="${tnoteData.tdEndIdx - tnoteData.tdStartIdx}" style="text-align: center; vertical-align: middle; background-color: royalBlue; border-left: 1px solid transparent; border-right: 1px solid transparent; -webkit-background-clip: padding; -moz-background-clip: padding; background-clip:padding-box;"></td>`;
		prevEndIdx = tnoteData.tdEndIdx;
	    }

	    if (tnoteDatas.at(-1).tdEndIdx < captionPieces.length) {
		html += `<td colspan="${captionPieces.length - lastSeenTdEndIdx}"></td>`;
	    }
	}
	
	html += `        </tr>`;
	return html;
}

const buildTnotePanelHTML = (translations: Translation[]) : string => {
	let html = `<div id="tnote-panel">`;
	for (const translation of translations) {
	    recurseTnotes(translation.fullTranslation, (tnote, depth, path) => {
		html += `    <div id="tnote" language="${translation.targetLang}" path="${path.join('-')}" style="display: none;">
				 ${tnote.translation}
				 ${buildTnoteAnnotationsContainerHTML(tnote)}
				 <a language="${translation.targetLang}" path="${path.join('-')}" id="hide-tnote-button" style="margin-left: 16px; color: crimson">X</a> 
			     </div>`;
	    }, null);
	}
	html += `</div>`;
	return html;
}

const buildTnoteAnnotationsContainerHTML = (tnote: TNote) => {
       let possibleWords = tnote?.annotations?.possible_words ?? []
       if (possibleWords.length == 0) return ""
       
       html = `        <div id="tnote-annotations"><table id="possible-words"><tbody>`;
       for (const possibleWord of possibleWords) {
             html += `<tr><td style="vertical-align:top;"><h3>${possibleWord?.word}</h3></td><td>${serializeVariableToHTML(possibleWord)}</td></tr>`;
       }
       html += `        </tobdy></table></div>`;
       return html;
}

const serializeVariableToHTML = (variable: Any) : string => {
      if (variable instanceof Array || variable instanceof Set) {
          if (variable.length === 0) {
	      return null;
          } else if (variable[0] instanceof Array || variable[0] instanceof Set || variable[0] instanceof Object || variable[0] instanceof Map) {
	      let html = "";
	      for (const item of variable) {
		  html += `<div>${serializeVariableToHTML(item)}</div>`;
	      }
	      return html;
	  } else {
	      const tagName = (variable instanceof Array) ? "ol" : "ul";
	      let html = `<${tagName}>`;
	      for (const item of variable) {
		  html += `<li>${serializeVariableToHTML(item)}</li>`;
	      }
	      html += `</${tagName}>`;
	      return html;
	  }
      } else if (variable instanceof Object || variable instanceof Map) {
          let html = `<table><tbody>`;
          for (const [key, value] of Object.entries(variable)) {
	      const valueHtml = serializeVariableToHTML(value);
	      if (!valueHtml || valueHtml.length == 0) continue;
	      
              html += `<tr>
	              <td style="vertical-align:top;"><b>${key}:</b></td>
		      <td>${valueHtml}</td>
		  </tr>`;
	  }
	  html += `</tbody></table>`;
	  return html;
      } else {
	  return `${variable}`;
      }
}

const recurseTnotes = (tnote: Tnote, preCallback: (tnote: Tnote, depth: number, path: number[]) => void, postCallback: (tnote: Tnote, depth: number, path: number[]) => void) => {
       const path = [0];
       _recurseTnotes(tnote, 0, path, preCallback, postCallback);
}


const _recurseTnotes = (tnote: Tnote, depth: number = 0, path: number[] = [], preCallback: (tnote: Tnote, depth: number, path: number[]) => void, postCallback: (tnote: Tnote, depth: number, path: number[]) => void) => {
       // Can't guarantee how users will use 'path' in the callback, so
       // it is safer to make a copy of it so that the user doesn't
       // mess up the actual path during the recursion.
       if (preCallback) preCallback(tnote, depth, Array.from(path));

       for (const [idx, subnote] of tnote.subnotes.entries()) {
       	   path.push(idx);
	   _recurseTnotes(subnote, depth+1, path, preCallback, postCallback);
	   path.pop();
       }

       // Can't guarantee how users will use 'path' in the callback, so
       // it is safer to make a copy of it so that the user doesn't
       // mess up the actual path during the recursion.
       if (postCallback) postCallback(tnote, depth, Array.from(path));
}


const attachTranslationListeners = () => {
       for (const segment of segment_2_translations.keys()) {
       	   const tnotePanel = segment.querySelector("#tnote-panel");
	   
           const tnoteButtons = segment.querySelectorAll("#caption-content #tnote-button") ?? [];
	   for (const tnoteButton of tnoteButtons) {
	       const language = tnoteButton.getAttribute("language");
	       if (!language) throw new Error("attachTranslateListeners() error: found tnoteButton with missing language info");
	       const path = tnoteButton.getAttribute("path");
	       if (!path) throw new Error("attachTranslateListeners() error: found tnoteButton with missing path info");

	       const tnote = tnotePanel.querySelector(`#tnote[language=${language}][path="${path}"]`);
	       if (!tnote) throw new Error("attachTranslateListeners() error: cannot find tnote corresponding to tnoteButton");
	       
	       tnoteButton.onclick = () => {
		   if (tnote.style.display === "none") {
		       displayTnotes([tnote], tnotePanel);
		   } else {
		       displayTnotes([], tnotePanel);
		   }};
	   }

	   const hideTnoteButtons = segment.querySelectorAll("#tnote-panel #hide-tnote-button") ?? [];
	   hideTnoteButtons.forEach(hideTnoteButton => {
	       const tnote = hideTnoteButton.closest("#tnote");
	       if (!tnote) throw new Error("attachTranslationListeners() error: Could not find tnote corresponding to the hideTnoteButon");

	       hideTnoteButton.onclick = () => {
	           setTnoteVisibility(false, tnote);
	       }
	   });
      }
}
