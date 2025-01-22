

export function initPagePolicy() {
    if (typeof window.trustedTypes == 'undefined') window.trustedTypes = {createPolicy: (n, rules) => rules};

    export const policy = trustedTypes.createPolicy('youtube-enchanter', {
      createHTML: (string, sink) => {
	return string;
      }
    });
}
