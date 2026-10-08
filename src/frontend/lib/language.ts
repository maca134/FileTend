// Monaco infers the language from the model path; these aren't in its ini defaults.
export const getLanguageForPath = (path: string) =>
	/\.(env|conf)$/i.test(path) ? "ini" : undefined;
