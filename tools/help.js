#!/usr/bin/env node

import yargs from 'yargs';
import prompt from 'prompt';
import colors from "@colors/colors/safe.js";
import {exec} from 'child_process';
import fs from "fs-extra";
import cliSpinners from 'cli-spinners';
import ora from 'ora';

console.log(colors.yellow("==================================="));
console.log(colors.yellow("=========== HORIZEN HELP =========="));
console.log(colors.yellow("==================================="));
console.log("");
console.log(colors.yellow("horizen-create [--debug]"), colors.gray("- создаст папку с шаблонным модулем."));
console.log(colors.yellow("horizen-reinstall [-f]"), colors.gray("- переустановит зависимости внутри модуля. С флагом -f обновит horizen из установленного глобального пакета"));
console.log(colors.yellow("horizen-tester --verbose"), colors.gray("- запустит автотесты для фронта или бэка."));
console.log(colors.yellow("horizen-help"), colors.gray("- покажет это сообщение."));
console.log(colors.yellow("horizen-run [process]"), colors.gray("- запустит указанный процесс. Для некста только dev или prod. Для бэка что угодно внутри папки processes"));
console.log(colors.yellow("Для запуска команды в локальном пакете (если глобального нет) используем npx (npx horizen-run)"));
console.log(colors.gray("==================================="));
console.log(colors.gray("v Если нужно обновить horizen глобально v"));
console.log(colors.yellow("sudo npm install -g git@github.com:B2B-Engineering-Group/horizen-framework.git#master"));
console.log(colors.gray("v Если вдруг npm ломается по EACCESS при реинсталле (если ставили через sudo) v"));
console.log(colors.yellow("sudo chown -R $(whoami) ~/.npm"));
console.log(colors.yellow("sudo chown -R $(whoami) ."));