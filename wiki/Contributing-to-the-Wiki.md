# Contributing to the Wiki
If you're reading this, then you're interested in helping us document the system via the Wiki, thank you!
We want to make sure that contributing to the Wiki is as easy as possible so that anyone that would like to help us with this task can do so. In that light, some guidelines to contribute to the Wiki are outlined below.

## How the Wiki is updated
Typically, a repository's Wiki can only be updated by the owners of that repo, this made community provided documentation cumbersome to include. In order to easily accept community provided documentation this repository is utilizing a [GitHub Action](https://github.com/Andrew-Chen-Wang/github-wiki-action) which will generate the Wiki from any Markdown files merged to the [`publish-wiki` branch's `/wiki/` folder](https://github.com/foundryvtt/dnd5e/tree/publish-wiki/wiki). If you would like to submit documentation to be included in the Wiki, please review the recommendations below and the steps to open an issue and submit a Pull Request below.

## Style Guide
When submitting a Markdown file for consideration for the Wiki, we ask you to follow the style guide outlined here, this will ensure consistency between all of our wiki pages.

### Markdown Formatting
Use [GitHub's Basic Formatting Syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#headings) as a guide on how to format text with Markdown, as GitHub does not support all general Markdown formatting you may find in other guides.

### Assets
When taking a screenshot or screen recording, all modules should be disabled. The wiki is intended for core System functionality only.
When adding an image or video, first upload the asset to the original Issue created for the update. This will provide us with a reliable link to that asset for use between your Fork and the dnd5e system.  
- Images
    - I dunno, any guidelines here?
    - Recommended software for taking and annotating screenshots?
- Videos
    - Webm preferred? Does is matter?
    - Recommended software to capture video?

### File Names and Links
The name of your Markdown file is what will be used for the name of the Wiki Page in the table of contents, with hyphens turning into spaces, so `My-first-Wiki-page.md` will become `My first Wiki page`. 
When you want to link to another page in the wiki, in your file make sure to link to the Markdown file in the `wiki` folder, the GitHub Action will automatically strip the `.md` extension and generate the appropriate link to the wiki page, for example linking to `[Hyperlink Text](Advancement-Type-Hit-Points.md)` in your documents will always generate a link to `[Hyperlink Text](https://github.com/foundryvtt/dnd5e/wiki/Advancement-Type-Hit-Points)` in the Wiki.  
Always make sure to update the `Home.md` file with a link to your new Markdown file.

### That little version tag?
***Do we want to have the version tag at the top of all of our docs to reflect the version the page was last updated?***  
In order to let readers know when a Wiki page was last updated, please include a Version tag like this one at the top of the page.
![](https://img.shields.io/static/v1?label=dnd5e&message=2.0.0&color=informational)    
`![](https://img.shields.io/static/v1?label=dnd5e&message=2.0.0&color=informational)`  

# Submitting to the Wiki

## Create a Wiki Issue
Just like any other issue on the repo, the title should reflect a brief description of the task at hand, and the Description should provide us with information about what will be added to the wiki. Make sure to include all of your assets in this issue, as mentioned in the style guide above.  
Example: Review the Issue created for submitting this document you're currently reading here: [Wiki - Create a Contributing to the Wiki guide](https://github.com/foundryvtt/dnd5e/issues/2379)

## Submit a PR
In order to contribute directly to the Wiki, you will need to fork the dnd5e repo and make a branch from the `publish-wiki` branch of the repo, then you will be able to add your Markdown files or update the existing files, and submit a Pull Request.  

### Fork the `dnd5e` Repo
To contribute to the wiki, [fork this project](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Once you have forked the dnd5e repo, you will want to create a branch from the `publish-wiki` branch of the dnd5e repo. To do this, click on the branches button, then click on New Branch. Give your new Branch a descriptive name, then make sure to update the Source to the upstream repository `foundryvtt/dnd5e`and select the `publish-wiki` branch. You only need to fork the `dnd5e` repo once, but you will create a new branch for each new issue/PR.  

https://github.com/foundryvtt/dnd5e/assets/86370342/26c67b33-9260-4bfa-a9be-78054a248d1c

### Make Your Updates  
Either edit the existing files, or add your own Markdown files within the `wiki` folder of your newly created branch, when done click the `Commit changes` button, you will be asked to either `Save and Merge` or `Create a New Branch`, choose `Save and Merge`. This will commit the changes to your branch, keep in mind that each commit to the branch will be recorded and listed individually in your PR, so we recommend making sure to `Preview` your changes prior to commiting to catch any minor mistakes, or editing your files in a separate editor such as Notepad ++, VSCode, or your text editor of choice, to keep the PR as clean as possible.  

https://github.com/foundryvtt/dnd5e/assets/86370342/251f4dc6-9f40-4ec0-966b-e1caeadc31e8


### Submit a PR 
You will now be able to submit those changes back to the DnD5e system via a [pull request (PR)](https://docs.github.com/en/get-started/quickstart/contributing-to-projects#making-a-pull-request) against the `publish-wiki` branch.  
From the main page of your repo, click the `Contribute` button and `Open pull request` for the system. When submitting a PR for the wiki, make sure the base repository is `foundryvtt/dnd5e` and the base branch is `publish-wiki`. Give the PR a name, and reference your original issue in the description.
Your PR is now submitted and will be reviewed by the Dnd5e team!
Example: Review the PR created for submitting this document you're currently reading here: [Create Contributing-to-the-Wiki.md](https://github.com/foundryvtt/dnd5e/pull/2380)  

https://github.com/foundryvtt/dnd5e/assets/86370342/ad48b9d5-5d44-4fce-84bf-dbf097b64438

## Updating your PR
You may want to make changes to your files, or may be asked to make changes by the DnD5e team. To do this, you will make those changes to the branch that your PR originated from, any new commits to your branch will automatically be applied to the PR for review.

## Merging the PR
The DnD5e team will merge your PR once all appropriate changes are made, the GitHub Action will automatically run, and your submission will be added to the Wiki page!
