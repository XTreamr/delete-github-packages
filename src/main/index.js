'use strict'

const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN
const GITHUB_API_USERNAME = process.env.GITHUB_API_USERNAME
const request = require('superagent')
const gitHubAPI = 'https://api.github.com'
const tags = {
  DEV: 'DEV',
  PRE: 'PRE',
  LATEST: 'LATEST',
  NO_TAG: 'NO_TAG',
}

async function getPackagesOrgOwner(org, package_type, package_name, page) {
  try {
    if (!page) {
      throw new Error('Error retrieving GitHub data')
    }

    const res = await request
      .get(`${gitHubAPI}/orgs/${org}/packages/${package_type}/${package_name}/versions?per_page=100&page=${page}`)
      .set('User-Agent', GITHUB_API_USERNAME.toString())
      .set('Authorization', 'token ' + GITHUB_API_TOKEN)
      .set('Accept', 'application/vnd.github.v3+json')
    return res
  } catch (err) {
    console.log(err)
  }
}

async function getAllPackages() {
  let pageIndex = 1
  let packages = []
  const packagesInit = await getPackagesOrgOwner('xtreamr', 'docker', 'go_playlist_v3', 1)
  console.log('GitHub connection ok')
  const lastPage = packagesInit.links.last ? packagesInit.links.last : null
  const lastPageIndex = lastPage ? lastPage.substring(lastPage.length - 1, lastPage.length) : null
  if (!lastPage) {
    const singlePageRequest = await getPackagesOrgOwner(PROJECT_OWNER, 'docker', PROJECT_NAME, pageIndex.toString())
    packages = packages.concat(singlePageRequest.body)
    return packages
  }

  while (pageIndex <= lastPageIndex) {
    let packagesRequest = await getPackagesOrgOwner(PROJECT_OWNER, 'docker', PROJECT_NAME, pageIndex.toString())
    packages = packages.concat(packagesRequest.body)
    pageIndex++
  }

  return packages
}

function getPackagesToDelete(packages) {
  const limit = 9
  const orderedPackages = {
    DEV: [],
    PRE: [],
    LATEST: [],
    NO_TAG: [],
  }

  const tagPackagesCounter = {
    DEV: 0,
    PRE: 0,
    LATEST: 0,
    NO_TAG: 0,
  }

  for (const gitHubPackage of packages) {
    const tag = gitHubPackage.metadata.docker.tags[0]
    if (tag.includes(tags.DEV) || tag.includes(tags.DEV.toLowerCase())) {
      if (tagPackagesCounter.DEV > limit) {
        orderedPackages.DEV.push(gitHubPackage)
      }

      tagPackagesCounter.DEV++
    } else if (tag.includes(tags.PRE) || tag.includes(tags.PRE.toLowerCase())) {
      if (tagPackagesCounter.PRE > limit) {
        orderedPackages.PRE.push(gitHubPackage)
      }

      tagPackagesCounter.PRE++
    } else if (tag.includes(tags.LATEST) || tag.includes(tags.LATEST.toLowerCase())) {
      if (tagPackagesCounter.LATEST > limit) {
        orderedPackages.LATEST.push(gitHubPackage)
      }

      tagPackagesCounter.LATEST++
    } else {
      if (tagPackagesCounter.NO_TAG > limit) {
        orderedPackages.NO_TAG.push(gitHubPackage)
      }

      tagPackagesCounter.NO_TAG++
    }
  }

  return orderedPackages
}

function sortByUpdateDate(packages) {
  return packages.sort(function (a, b) {
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
}

function getTotalPackageToDelete(packagesToDelete) {
  return (
    packagesToDelete.DEV.length +
    packagesToDelete.PRE.length +
    packagesToDelete.LATEST.length +
    packagesToDelete.NO_TAG.length
  )
}

async function deletePackage(org, package_type, package_name, id) {
  try {
    if (!id) {
      throw new Error('No id')
    }

    const res = await request
      .delete(`${gitHubAPI}/orgs/${org}/packages/${package_type}/${package_name}/versions/${id}`)
      .set('User-Agent', 'adriandeka')
      .set('Authorization', 'token ' + GITHUB_API_TOKEN)
      .set('Accept', 'application/vnd.github.v3+json')
    return res
  } catch (err) {
    console.log(err)
  }
}

async function deleteOrderedPackages(orderedPackages) {
  console.log(`### Deleting deprecated ${tags.DEV} packages...`)
  for (const devPackage of orderedPackages.DEV) {
    const result = await deletePackage(PROJECT_OWNER, 'docker', PROJECT_NAME, devPackage.id)
    if (result.status === 204) {
      console.log(`${tags.DEV} Package ${devPackage.id} deleted succesfully`)
    } else {
      console.log(`Cannot delete ${tags.DEV} package ${devPackage.id}`)
    }
  }

  console.log(`### Deleting deprecated ${tags.PRE} packages... `)
  for (const prePackage of orderedPackages.PRE) {
    const result = await deletePackage(PROJECT_OWNER, 'docker', PROJECT_NAME, prePackage.id)
    if (result.status === 204) {
      console.log(`${tags.PRE} Package ${prePackage.id} deleted succesfully`)
    } else {
      console.log(`Cannot delete ${tags.PRE} package ${prePackage.id}`)
    }
  }

  console.log(`### Deleting deprecated ${tags.LATEST} packages...`)
  for (const latestPackage of orderedPackages.LATEST) {
    const result = await deletePackage(PROJECT_OWNER, 'docker', PROJECT_NAME, latestPackage.id)
    if (result.status === 204) {
      console.log(`${tags.LATEST} Package ${latestPackage.id} deleted succesfully`)
    } else {
      console.log(`Cannot delete ${tags.LATEST} package ${latestPackage.id}`)
    }
  }

  console.log(`### Deleting deprecated ${tags.NO_TAG} packages...`)
  for (const noTagPackage of orderedPackages.NO_TAG) {
    const result = await deletePackage(PROJECT_OWNER, 'docker', PROJECT_NAME, noTagPackage.id)
    if (result.status === 204) {
      console.log(`${tags.NO_TAG} Package ${noTagPackage.id} deleted succesfully`)
    } else {
      console.log(`Cannot delete ${tags.NO_TAG} package ${noTagPackage.id}`)
    }
  }
}

function validateEnv(){
  return !GITHUB_API_TOKEN || !GITHUB_API_USERNAME
}

const main = async function main(config) {
  if (!config) {
    console.log("config not defined")
    return
  }

  console.log(config)

  const envValidation = validateEnv()
  if (!envValidation) {
    // throw new Error('Error: Check ENV variables (GITHUB_API_TOKEN, GITHUB_API_USERNAME) are defined')
    console.log('Error: Check ENV variables (GITHUB_API_TOKEN, GITHUB_API_USERNAME) are defined')
    return
  }

  // console.log(`### Delete old github script - START`)
  // const packages = await getAllPackages()
  // console.log(`### Total packages: ${packages.length}`)
  // const sortedPackages = sortByUpdateDate(packages)
  // console.log(`### Sort packages by update date done`)
  // const packagesToDelete = getPackagesToDelete(sortedPackages)
  // const totalsToDelete = getTotalPackageToDelete(packagesToDelete)
  // console.log(`### Total Packages to delete: ${totalsToDelete}`)
  // await deleteOrderedPackages(packagesToDelete)
  // console.log(`### Delete old github script - FINISHED`)
}

export default main;