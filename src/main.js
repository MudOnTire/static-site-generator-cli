import fs from 'fs';
import path from 'path';
import ncp from 'ncp';
import chalk from 'chalk';
import { promisify } from 'util';
import execa from 'execa';
import { projectInstall } from 'pkg-install';
import Listr from 'listr';

const access = promisify(fs.access);
const copy = promisify(ncp);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

async function copyTemplateFiles(options) {
  const gitRepos = {
    'javascript': 'git@github.com:MudOnTire/static-site-boilerplate.git',
    'typescript': 'git@github.com:MudOnTire/static-site-boilerplate.git',
  }

  const repoUrl = gitRepos[options.template.toLowerCase()];

  if (!repoUrl) {
    return Promise.reject(new Error(`No git repository found for template ${options.template}`));
  }

  // 用于存放git template的临时文件夹
  const gitTempDir = path.resolve(process.cwd(), `git-temp-${+new Date()}`);
  if (!await exists(gitTempDir)) await mkdir(gitTempDir);

  const result = await execa('git', ['clone', repoUrl], {
    cwd: gitTempDir
  });

  if (result.failed) {
    return Promise.reject(new Error(`Failed to clone template from git repository ${repoUrl}`));
  } else {
    await copy(gitTempDir, options.targetDirectory, { clobber: false });
    await rmdir(gitTempDir, { recursive: true });
  }
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
      task: () => copyTemplateFiles(options)
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