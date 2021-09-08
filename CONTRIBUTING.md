# Contributing to foundrynet/dnd5e

Code and content contributions are accepted. Please feel free to submit issues to the issue tracker or submit merge requests for code/content changes. Approval for such requests involves code and (if necessary) design review by the Maintainers of this repo. Please reach out on the [Foundry Community Discord](https://discord.gg/foundryvtt) with any questions.

Please ensure there is an open issue about whatever contribution you are submitting. Please also ensure your contribution does not duplicate an existing one.

## Developer Tooling

Cloning this repository down and either placing it or symlinking it to your `/Data/systems/dnd5e` user data directory is all that is necessary to run this within Foundry VTT. However, if you want to make changes to either the LESS stylesheets or the compendia, there are some developer tools which will make your life easier.

This repository leverages [gulp](https://gulpjs.com/) to run automated build tasks. If your system supports `npm`, you can run the following commands from the root of the project to get set up:

### `npm install`

Installs all dependencies needed to run developer tooling scripts.

### `npm run build` / `gulp css`

Runs all relevant build scripts:

- Converts LESS -> CSS
- Converts JSON -> DB (compendia)

### `npm run build:watch` / `gulp`

Runs the LESS -> CSS builder in watch mode so that changes made to the LESS files will automatically compile to CSS.

## Issues

Check that your Issue isn't a duplicate (also check the closed issues, as sometimes work which has not been released closes an issue).
Issues which are assigned to a Milestone are considered "Prioritized." This assignment is not permanent and issues might be pushed out of milestones if the milestone is approaching a releaseable state without that work being done.

### Bugs

- Ensure that the bug is reproducable with no modules active. If the bug only happens when a module is active, report that to the module's author.
- Provide hosting details as they might be relevant.
- Provide clear step-by-step reproduction steps, as well as what you expected to happen during those steps vs what actually happened.

### Feature Requests

Any feature request should be considered from the lens of "Does this belong in the core system?"

- Does the RAW support this feature? If so, provide some examples.
- Is the missing feature in the System Reference Document? If not, it might still be supportable, but it is worth mentioning in the request.
- Does this feature help a GM run a fifth edition game in Foundry VTT?

## Content

All Content released with this system must come from the WotC [5e System Reference Document](https://dnd.wizards.com/articles/features/systems-reference-document-srd) (aka SRD).

In general, content contributions will take the shape of fixing typos or bugs in the configuration of the existing items in the included compendia. If there is missing content, please open an issue detailing what is missing.

### Translations

Non-English languages are not contained within the core dnd5e system, but instead they are managed by specialized [localization modules](https://foundryvtt.com/packages/tag/translation).

Instead of opening an MR with translation files, create one of these modules (or contribute to an existing one!).

## Code

Here are some guidelines for contributing code to this project.

To contribute code, [fork this project](https://docs.gitlab.com/ee/user/project/repository/forking_workflow.html) and open a [merge request (MR)](https://docs.gitlab.com/ee/user/project/merge_requests/getting_started.html) against the correct development branch.

### Linked Issues

Before, or alongside of, opening an MR, we ask that you open a feature request issue. This will let us discuss the approach and prioritization of the proposed change.

If you want to work on an existing issue, leave a comment saying you're going to take a crack at it so that other contributors know not to duplicate work. Similarly, if you see an issue is assigned to someone, that member of the team has made it known they are working on it.

When you open an MR it is recommended to [link it to an open issue](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically). Include which issue it resolves by putting something like this in your description:

```text
Closes #32
```

### Priority of Review

Please appreciate that reviewing contributions constitutes a substantial amount of effort and our resources are limited. As a result of this, Merge Requests are reviewed with a priority that roughly follows this:

#### High Priority

- Bug Fix
- Small Features related to issues assigned to the current milestone

#### Medium Priority

- Large Features related to issues assigned to the current milestone
- Small Features which are out of scope for the current milestone

#### Not Prioritized

- Large Features which are out of scope for the current milestone

### Merge Request Review Process

MRs have a few phases:

0. **Prioritization.** If the MR relates to the current milestone, it is assigned to that milestone.
1. **Initial Review from the 5e contributor team.** This lets us spread out the review work and catch some of the more obvious things that need to be fixed before final review. Generally this talks about code style and some methodology.
2. **Final Review from the Maintainers.** Atropos and Kim have final review and are the only ones with merge permission.

#### MR Size

Please understand that large and sprawling MRs are exceptionally difficult to review. As much as possible, break down the work for a large feature into smaller steps. Even if multiple MRs are required for a single Issue, this will make it considerably easier and therefore more likely that your contributions will be reviewed and merged in a timely manner.
