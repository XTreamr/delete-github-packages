# delete-github-packages

Delete (old) github repo packages

## Config

First, set up a simple config:

```javascript
{
  "deleteGithubPackageOptions": {
    "project_name": 'go_playlist_v3',
    "package_type": "docker",
    "project_owner": "xtreamr",
  }
}
```

## Env

To execute this program properly, you must setup these enviroment variables:

```bash
export GITHUB_API_TOKEN=<token>
export GITHUB_API_USERNAME=<username>
```

## Usage

```javascript
const deleteGithubPackages = require('@xtreamr/delete-github-packages');

deleteGithubPackages
	.init(config)
	.then(() => {
		console.log('deleteGithubPackages finished!');
	})
	.catch((e) => {
		console.log('An unexpected error !', e);
	});
```
