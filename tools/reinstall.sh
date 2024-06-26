#!/usr/bin/env bash

if [[ $1 = "-n" ]]; then
	echo "Обновляем модуль без локального фреймворка"
	rm -rf ./.horizen-framework 
	chown -R $(whoami) .
	echo "Готово"
elif [ ! -d "./.horizen-framework" ]; then
	echo "./.horizen-framework отсутствует, устанавливаем .."
	rm -rf ./.horizen-framework 
	cp -rf $(npm list -g horizen-framework | grep "/")/node_modules/horizen-framework ./.horizen-framework
	rm -rf ./.horizen-framework/.git
	rm -rf ./.horizen-framework/templates
	rm -rf ./.horizen-framework/articles
	chown -R $(whoami) .
	echo "Готово"
elif [[ $1 = "-f" ]]; then
	echo "Переустанавливаем ./.horizen-framework .."
	rm -rf ./.horizen-framework 
	cp -rf $(npm list -g horizen-framework | grep "/")/node_modules/horizen-framework ./.horizen-framework
	rm -rf ./.horizen-framework/.git
	rm -rf ./.horizen-framework/templates
	rm -rf ./.horizen-framework/articles
	chown -R $(whoami) .
	echo "Готово"
else
	echo "./.horizen-framework не затронут, используйте флаг -f для переустановки"
fi

rm -rf node_modules && rm -f package-lock.json && npm install && git submodule update --init --recursive