import { basename } from "./path";
import {
	SETI_DEFAULT_ICON,
	SETI_ICONS,
	SETI_RULES,
	type SetiIconData,
	type SetiRuleKind,
} from "./seti-icons.generated";

const RULE_TIER: Record<SetiRuleKind, number> = {
	filename: 0,
	extension: 1,
	partial: 2,
};

function resolveSetiIconName(filename: string): string {
	let best: { icon: string; tier: number; specificity: number } | null = null;

	for (const rule of SETI_RULES) {
		let matches: boolean;
		switch (rule.kind) {
			case "filename":
				matches = filename === rule.pattern;
				break;
			case "extension":
				matches = filename
					.toLowerCase()
					.endsWith(rule.pattern.toLowerCase());
				break;
			case "partial":
				matches = filename.includes(rule.pattern);
				break;
		}
		if (!matches) continue;

		const tier = RULE_TIER[rule.kind];
		const specificity = rule.pattern.length;
		if (
			!best ||
			tier < best.tier ||
			(tier === best.tier && specificity > best.specificity)
		) {
			best = { icon: rule.icon, tier, specificity };
		}
	}

	return best?.icon ?? SETI_DEFAULT_ICON;
}

export function getSetiIcon(path: string): SetiIconData {
	const iconName = resolveSetiIconName(basename(path));
	return SETI_ICONS[iconName] ?? SETI_ICONS[SETI_DEFAULT_ICON]!;
}
