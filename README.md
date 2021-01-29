# @dlid/gitrid

Simple tool to delete local git branches that are no longer used

------------------------

`gitrid` will "Git rid" of those zombie branches that no longer exists in the remote repository.

- If a branch has unpushed changes it will not be flagged for deletion
- If a branch is active it will not be flagged for deletion


# Installation

Install it globally for easy access

    npm install -g @dlid/gitrid

# Usage

    gitrid [folder] [--yes|-y] (--verbose | --silent) [--plain-text]

Gitrid will run in your current working folder by default.

To check the current working directory just enter

    gitrid
    
## Parameters

| Name | Description  
|---|---
|`[folder]`|a path different from the working folder that you want to check
|`--yes` (`-y`) | Automatically delete any found zombie branches without asking for confirmation
|`--version` (`-v`) | Returns the gitrid version number
| `--silent` |   Log nothing but errors (must be used toghether with `--yes`
|`--verbose`|Log in more detail what is done
|`--plain-text`|Will strip away console colors from all output


```
# Run gitrid in specified folder
gitrid D:/Code

# Run gitrid in specified folder, automatically delete branches if any are found
gitrid D:/Code --yes

# Run gitrid in current folder with verbose logging
gitrid --verbose
```
# Behind the scenes

Gitrid will perform the following actions:

- `git remote get-url origin` - Find the URL for the working folder or folder you specify ()
- `git branch` List local branches
- `bit branch -r` - List remote branches
- If a local branch does not exist in remote repository:
    - `git log --branches --not --remotes --source` will be run to see if the branch has any pending commits
- User will confirm to delete ZOMBIE marked branches, and then for each branch:
    - `git branch -d [BRANCH NAME]` Delete branch

# Change log

- 1.0.5 - Reworked how remote branches are checked. Previous didn't work very well. Fixed issue where --verbose did not work
- 1.0.4 - Less output by default. Rearranged some code. Added --verbose, --silent, --plain-text, --help options
- 1.0.3 - Remote branches are now received once, and not per local branch
- 1.0.2 - Added check to see if local-only branch has any commits. This will not be flagged for deletion
- 1.0.1 - Fix where the bin/index.js file was including the wrong file
- 1.0.0 - First version
