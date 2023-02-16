

ci:
	npm ci
	

build:
	npm run build
	mv --force dnd5e-compiled.mjs dnd5e.mjs
	zip dnd5e-release-$$(jq -r '.version' system.json).zip -r icons lang json packs/*.db templates tokens ui dnd5e.css dnd5e.mjs dnd5e-compiled.mjs.map LICENSE.txt OGL.txt README.md system.json template.json

release: build
	python -m http.server 43516

unbuild:
	git checkout -- "packs/**.json"
	git ls-files -o --exclude-standard | grep 'packs/.*\.json$$' | xargs rm

removemanual:
	git checkout -- packs/src/classes/monk.json
	git checkout -- packs/src/classes/warlock.json
	git checkout -- packs/src/classes/wizard.json
	git checkout -- packs/src/classfeatures/mystic-arcanum-6th-level-spell.json
	git checkout -- packs/src/classfeatures/mystic-arcanum-7th-level-spell.json
	git checkout -- packs/src/classfeatures/mystic-arcanum-8th-level-spell.json
	git checkout -- packs/src/classfeatures/mystic-arcanum-9th-level-spell.json
	rm packs/src/classfeatures/mystic-arcanum.json
	git checkout -- packs/src/classfeatures/signature-spells-first-spell.json
	git checkout -- packs/src/classfeatures/signature-spells-second-spell.json
	rm packs/src/classfeatures/signature-spells.json
	git checkout -- packs/src/classfeatures/unarmed-strike-monk.json
