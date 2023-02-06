

ci:
	npm ci
	

build:
	npm run build
	mv --force dnd5e-compiled.mjs dnd5e.mjs
	zip dnd5e-release-$$(jq -r '.version' system.json).zip -r icons lang json packs/*.db templates tokens ui dnd5e.css dnd5e.mjs dnd5e-compiled.mjs.map LICENSE.txt OGL.txt README.md system.json template.json

release: build
	python -m http.server 43516