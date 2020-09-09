import fs from 'fs';
import path from 'path';
import ncp from 'ncp';
import chalk from 'chalk';
import { promisify } from 'util';
import execa from 'execa';
import { projectInstall } from 'pkg-install';
import Listr from 'listr';
import download from 'download-git-repo';

const access = promisify(fs.access);

async function downloadTemplate(repoUrl, targetDir) {
  return new Promise((resolve, reject) => {
    download(repoUrl, targetDir, { clone: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function loadRemoteTemplate(options) {
  const gitRepos = {
    'javascript': 'direct:https://github.com/MudOnTire/static-site-boilerplate',
    'typescript': 'direct:https://github.com/MudOnTire/static-site-boilerplate#typescript',
  }

  const repoUrl = gitRepos[options.template.toLowerCase()];
  if (!repoUrl) return Promise.reject(new Error(`No git repository found for template ${options.template}`));

  await downloadTemplate(repoUrl, options.targetDirectory);
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory
  });
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize Git'));
  }
  return;
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.projectName ?
      path.resolve(process.cwd(), options.projectName) : process.cwd(),
  };
  console.log('options === ', options);

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../templates',
    options.template.toLowerCase()
  );

  options.templateDirectory = templateDir;
  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    cosnole.error('%s Invalid template name', chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: 'Copy project files',
      task: () => loadRemoteTemplate(options)
    },
    {
      title: 'Initialize git',
      task: () => initGit(options),
      enabled: () => options.git
    },
    {
      title: 'Install dependencies',
      task: () => projectInstall({
        cwd: options.targetDirectory
      }),
      skip: () => !options.runInstall ? 'Pass --install to automatically install dependencies' : undefined
    }
  ]);

  await tasks.run();

  console.log('%s Project ready', chalk.green.bold('DONE'));
  return true;
}