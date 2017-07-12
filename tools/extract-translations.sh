#!/bin/bash
###
# Utility program to extract translation strings from source files.
# This program can be used to create new locale files.
###

prefix="$1"
working="$(dirname "$(readlink -e "$0")")/.."
search=("$working/ui")

keyList="$(# Step one: Extract all keys. We will care about the fallback translations later.
(
	# Normal data binds
	grep -Phor "\bt:\s+([\'\"]).*?(?=\\1)" "${search[@]}" | grep -Po "(?<=[\'\"]).*"

	# Data binds with additional values:
	grep -Phor "\bt:\s+{[^}].*" "${search[@]}" | grep -Po "key:\s+([\'\"]).*?(?=\\1)" | grep -Po "(?<=[\'\"]).*"

	# Function calls to _('...')
	grep -Phor "(?<=_\(([\'\"])).*?(?=\\1)" "${search[@]}"
) | grep . | sort | uniq)"


echo "{";
# For each key look up a fallback value
delimter=''
for key in $keyList; do
	oldLine=''
	while read -r line; do
		# Check for duplicate translations with different contents
		line="${line//\'/\'\'}"
		if [ "$oldLine" != "" ]; then
			if [ "$oldLine" != "$line" ]; then
				echo "Warning: ignoring duplicate translation of '$key': '$line' vs '$oldLine'" >&2
			fi
			continue
		fi

		echo -ne "$delimiter\t\"$key\": \"$line\""
		delimiter=",\n"
		oldLine="$line"
	done < <(
		# look for HTML tags with translations like
		# data-bind="t: '$key'" or data-bind="t: { key: '$key' }"
		grep -orP \
			"(<([\w]+)([^>]*(t|key|'key'): '$key'[^>]*?)>)([^<]*)([^<]*<([\w]+)([^>]*?)(([\s]*\/>)|(>((([^<]*?|<\!\-\-.*?\-\->)|(?6))*)<\/\\7[\s]*>)))?[^<]*(<\/\\2[\s]*>)" \
			"${search[@]}" | grep -Po '(?<=>).*(?=<)'
		
		# Look for function call with second parameter
		grep -orP "(?<=_\(['\"]${key}['\"],)\s*(['\"]).*?\\1\)" \
			"${search[@]}" | grep -Po "(?<=['\"]).*(?=['\"])"
	)
done

echo -e "\n}"
