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

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
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