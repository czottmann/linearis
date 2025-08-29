I want to create a CLI tool for the ticketing and project management system Linear.app. Its purpose is to allow working with Linear via command-line while returning everything (except its usage example) as JSON.


## Communication with Linear

We use the pre-made, battle-tested [`LinearService` class](src/services/linear-service.ts) instead. It offers methods to work with all facets of Linear. This class builds upon the Linear Typescript SDK, which is described in broad terms here:

- [Getting started](https://linear.app/developers/sdk)
- [Fetching & modifying data](https://linear.app/developers/sdk-fetching-and-modifying-data)
- [Errors](https://linear.app/developers/sdk-errors)
- [Advanced usage](https://linear.app/developers/advanced-usage)


### Implementation scope

- Authentication via API token
  - passed in via ENV var "LINEAR_API_TOKEN", or `--api-token` flag value, or read from a plain-text token file at `$HOME/.linear_api_token`
- Working with projects
  - list existing projects
- Working with issues (tickets)
  - list
  - search
  - create
  - read
  - update
- Working with comments on issues
  - list
  - create

The CLI tool should be named `linear`, and offer this structure:

- `linear` w/o arguments: shows usage info, lists tools
- `linear projects`: shows projects usage info, lists sub-tools
  - `linear projects list`: returns projects list (`LinearService.getProjects()`)
- `linear issues`: shows issues usage info, lists sub-tools
  - `linear issues list`: lists issues (`LinearService.getIssues()`)
  - `linear issues search`: searches issues (`LinearService.searchIssues()`)
  - `linear issues create`: creates issue (`LinearService.createIssue()`)
  - `linear issues read`: read issue (`LinearService.getIssueById()`)
  - `linear issues update`: update issue (`LinearService.updateIssue()`)
- `linear comments`: shows comments usage, lists sub-tools
  - `linear comments list`: lists comments (`LinearService.getComments()`)
  - `linear comments create`: creates comment (`LinearService.createComment()`)

The data returned by the methods should be returned to the user as-is.
