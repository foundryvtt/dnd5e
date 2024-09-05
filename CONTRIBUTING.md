# Contributing to foundryvtt/dnd5e

Code and content contributions are accepted. Please feel free to submit issues to the issue tracker or submit merge requests for code/content changes. Approval for such requests involves code and (if necessary) design review by the Maintainers of this repo. Please reach out on the [Foundry Community Discord](https://discord.gg/foundryvtt) with any questions.

Please ensure there is an open issue about whatever contribution you are submitting. Please also ensure your contribution does not duplicate an existing one.

## Developer Tooling

Cloning this repository and either placing it in or symlinking it to your `Data/systems/dnd5e` user data directory is all that is necessary to run this within Foundry VTT. However, if you want to make changes to either the LESS stylesheets or the compendia, there are some developer tools which will make your life easier.

If your system supports `npm`, you can run the following commands from the root of the project to get set up:

### `npm install`

Installs all dependencies needed to run developer tooling scripts. Then will compile the necessary CSS and DB files.

### `npm run build`

Runs all relevant build scripts:

- Converts LESS -> CSS
- Converts JSON -> DB (compendia)

### `npm run build:css`

Converts the LESS in `./less` to the final `dnd5e.css`.

### `npm run build:watch`

Runs the LESS -> CSS builder in watch mode so that changes made to the LESS files will automatically compile to CSS.

### Compendia as JSON

This repository includes some utilities which allow the Compendia included in the System to be maintained as JSON files. This makes contributions which include changes to the compendia considerably easier to review.

#### Compiling Packs

Compile the source JSON files into compendium packs.

```text
npm run build:db
```

- `npm run build:db` - Compile all JSON files into their LevelDB files.
- `npm run build:db -- classes` - Only compile the specified pack.

#### Extracting Packs

Extract the contents of compendium packs to JSON files.

```text
npm run build:json
```

- `npm run build:json` - Extract all compendium LevelDB files into JSON files.
- `npm run build:json -- classes` - Only extract the contents of the specified compendium.
- `npm run build:json -- classes Barbarian` - Only extract a single item from the specified compendium.

#### Cleaning Packs

Cleans and formats source JSON files, removing unnecessary permissions and flags and adding the proper spacing.

```text
npm run build:clean
```

- `npm run build:clean` - Clean all source JSON files.
- `npm run build:clean -- classes` - Only clean the source files for the specified compendium.
- `npm run build:clean -- classes Barbarian` - Only clean a single item from the specified compendium.

## Issues

Check that your Issue isn't a duplicate (also check the closed issues, as sometimes work which has not been released closes an issue).
Issues which are assigned to a Milestone are considered "Prioritized." This assignment is not permanent and issues might be pushed out of milestones if the milestone is approaching a releaseable state without that work being done.

### Bugs

- Ensure that the bug is reproducible with no modules active. If the bug only happens when a module is active, report it to the module's author instead.
- Provide hosting details as they might be relevant.
- Provide clear step-by-step reproduction instructions, as well as what you expected to happen during those steps vs what actually happened.

### Feature Requests

Any feature request should be considered from the lens of "Does this belong in the core system?"

- Do the Rules as Written (RAW) support this feature? If so, provide some examples.
- Is the missing feature in the System Reference Document? If not, it might still be supportable, but it is worth mentioning in the request.
- Does this feature help a GM run a fifth edition game in Foundry VTT?

## Content

All Content released with this system must come from the WotC [5e System Reference Document](https://dnd.wizards.com/articles/features/systems-reference-document-srd) (aka SRD).

If there is missing content, please open an issue detailing what is missing.

In general, content contributions will take the shape of fixing typos or bugs in the configuration of the existing items in the included compendia JSON files, which are then compiled into the appropriate db file.

### Translations

Non-English languages are not contained within the core dnd5e system, but instead they are managed by specialized [localization modules](https://foundryvtt.com/packages/tag/translation).

Instead of opening an PR with translation files, create one of these modules (or contribute to an existing one!).

## Code

Here are some guidelines for contributing code to this project.

To contribute code, [fork this project](https://docs.github.com/en/get-started/quickstart/fork-a-repo) and submit a [pull request (PR)](https://docs.github.com/en/get-started/quickstart/contributing-to-projects#making-a-pull-request) against the correct development branch.

### Style

Please attempt to follow code style present throughout the project. An ESLint profile is included to help with maintaining a consistent code style. All warnings presented by the linter should be resolved before an PR is submitted.

- `npm run lint` - Run the linter and display any issues found.
- `npm run lint:fix` - Automatically fix any code style issues that can be fixed.

### Linked Issues

Before (or alongside) submitting an PR, we ask that you open a feature request issue. This will let us discuss the approach and prioritization of the proposed change.

If you want to work on an existing issue, leave a comment saying you're going to work on the issue so that other contributors know not to duplicate work. Similarly, if you see an issue is assigned to someone, that member of the team has made it known they are working on it.

When you open an PR it is recommended to [link it to an open issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue). Include which issue it resolves by putting something like this in your description:

```text
Closes #32
```

### Priority of Review

Please appreciate that reviewing contributions constitutes a substantial amount of effort and our resources are limited. As a result of this, Pull Requests are reviewed with a priority that roughly follows this:

#### High Priority

- Bug Fix
- Small Features related to issues assigned to the current milestone

#### Medium Priority

- Large Features related to issues assigned to the current milestone
- Small Features which are out of scope for the current milestone

#### Not Prioritized

- Large Features which are out of scope for the current milestone

### Pull Request Review Process

PRs have a few phases:

0. **Prioritization.** If the PR relates to the current milestone, it is assigned to that milestone.
1. **Initial Review from the 5e contributor team.** This lets us spread out the review work and catch some of the more obvious things that need to be fixed before final review. Generally this talks about code style and some methodology.
2. **Final Review from the Maintainers.** Atropos and Kim have final review and are the only ones with merge permission.

#### PR Size

Please understand that large and sprawling PRs are exceptionally difficult to review. As much as possible, break down the work for a large feature into smaller steps. Even if multiple PRs are required for a single Issue, this will make it considerably easier and therefore more likely that your contributions will be reviewed and merged in a timely manner.

## Releases

This repository includes a GitHub Actions configuration which automates the compilation and bundling required for a release when a Tag is pushed or created with the name `release-x.x.x`.

### Prerequisites

If either of these conditions are not met on the commit that tag points at, the workflow will error out and release assets will not be created.

- The `system.json` file's `version` must match the `x.x.x` part of the tag name.
- The `system.json` file's `download` url must match the expected outcome of the release CI artifact. This should simply be changing version numbers in the url to match the release version.

```text
https://github.com/foundryvtt/dnd5e/releases/download/release-1.6.3/dnd5e-1.6.3.zip
                                                     └─ Tag Name ──┘     └─ V ─┘ (version)
```

### Process for Release

`master` is to be kept as the "most recently released" version of the system. All work is done on development branches matching the milestone the work is a part of. Once the work on a milestone is complete, the following steps will create a system release:

0. [ ] Verify the `NEEDS_MIGRATION_VERSION` is correct.
1. [ ] `system.json` `version` and `download` fields are updated on the development branch (e.g. `1.5.x`).
2. [ ] A tag is created at the tip of the development branch with the format `release-x.x.x`, triggering the CI workflow (which takes ~2 mins to complete).
3. [ ] Development Branch is merged to `master` after the workflow is completed.
4. [ ] The foundryvtt.com admin listing is updated with the `manifest` url pointing to the `system.json` attached to the workflow-created release.
