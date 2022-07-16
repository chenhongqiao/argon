# Project Carbon - Next Generation Contest Server

[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/chenhongqiao/project-carbon.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/chenhongqiao/project-carbon/context:javascript)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
![License: AGPLv3](https://img.shields.io/npm/l/@pccs/server)

A fast and scalable online competitive programming contest system powered by cloud native computing. 

Project Carbon is currently under heavy development as [TeamsCode](https://www.teamscode.org)'s next-generation contest platform. Not all features are implemented and it's yet far from a finished product. This contest server is expected to appear in TeamsCode's Spring 2023 contest if not later.

## Packages

This monorepo contains 3 packages.

### [@pccs/server](https://www.npmjs.com/package/@pccs/server)

This package contains the backend portion of the contest server. It interacts with the user and the judger. Written in TypeScript.

### [@pccs/judger](https://www.npmjs.com/package/@pccs/judger)

This package contains the code to be used on judgers. It executes submissions in sandboxes and grade their outputs. Written in TypeScript.

### [@pccs/common](https://www.npmjs.com/package/@pccs/common)

Modules utilized by both the backend and the judger. Not designed to be used as a standalone package. Written in TypeScript.

## Contribution

TeamsCode is a student organization and this project is developed entirely by high school students. We developed this project with the hope that it can benefit the community while serving as TeamsCode's contest server.

While issues and pull requests are always welcomed, the best way to contribute to this project is to join our team. If you are a high school student and knows web development, feel free to email us at contact@teamscode.org for more info!
