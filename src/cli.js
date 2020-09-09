import arg from 'arg';
import inquirer from 'inquirer';
import { createProject } from './main';

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--git': Boolean,
      '--yes': Boolean,
      '--install': Boolean,
      '-g': '--git',
      '-y': '--yes',
      '-i': '--install'
    },
    {
      argv: rawArgs.slice(2)
    }
  );
  return {
    skipPrompts: args['--yes'] || false,
    git: args['--git'] || false,
    projectName: args._[0],
    template: args._[1],
    runInstall: args['--install'] || false,
  }
}

async function promptForMissingOptions(options) {
  const defaultTemplate = 'JavaScript';
  if (options.skipPrompts) {
    return {
      ...options,
      projectName: options.projectName || 'static-site-boilerplate',
      template: options.template || defaultTemplate
    }
  }

  const questions = [];
  if (!options.projectName) {
    questions.push({
      type: 'input',
      name: 'projectName',
      message: 'Please enter a project name',
    });
  }
  if (!options.template) {
    questions.push({
      type: 'list',
      name: 'template',
      message: 'Please choose which project template to use',
      choices: ['JavaScript', 'TypeScript'],
      default: defaultTemplate
    });
  }

  if (!options.git) {
    questions.push({
      type: 'confirm',
      name: 'git',
      message: 'Initialize a git repository',
      default: false
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    ...options,
    projectName: options.projectName || answers.projectName,
    template: options.template || answers.template,
    git: options.git || answers.git
  }
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  await createProject(options);
}