# @dlid/gitrid

Simple node script to delete local git branches if they do not exist in remote repository

------------------------
`gitrid` will "Git rid" of those zombie branches that no longer exists in the remote repository.

The steps taken are:

- `git remote get-url origin` - Find the URL for the working folder or folder you specify ()
- `git branch` List local branches
- `bit branch -r` - List remote branches
- If a local branch does not exist in remote repository:
    - `git log --branches --not --remotes --source` will be run to see if the branch has any pending commits
- User will confirm to delete ZOMBIE marked branches, and then for each branch:
    - `git branch -d [BRANCH NAME]` Delete branch


If a branch has unpushed changes it will not be flagged for deletion

If a branch is active it will not be flagged for deletion

# Installation

Install it globally for easy access

    npm install -g @dlid/gitrid

# Usage

    gitrid [FOLDER] [--yes|-y]

Gitrid will run in your current working folder by default.

To check the  current working directory just enter

    gitrid
    
## Parameters

- `-y` or `--yes` will automatically answer "yes" to the confirmation prompt to delete branches
- `[path]` a path different from the working folder that you want to check


    gitrid D:/Code
    gitrid D:/Code --yes
    
