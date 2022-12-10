# Argon Contest Server

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

A fast and scalable online competitive programming contest server powered by cloud native computing. 

Argon is currently under heavy development as [TeamsCode](https://www.teamscode.org)'s next-generation contest platform. Not all features are implemented and it's yet far from a finished product. This contest platform is expected to appear in TeamsCode's Spring 2023 contest if not later.

## Packages

This monorepo contains 3 packages.

### [@argoncs/server](https://www.npmjs.com/package/@argoncs/server)

This package contains the server portion of the contest platform. It interacts with the user and the judger.

### [@argoncs/judger](https://www.npmjs.com/package/@argoncs/judger)

This package contains the code to be used on judgers. It executes submissions in sandboxes and grade their outputs.

### [@argoncs/types](https://www.npmjs.com/package/@argoncs/types)

Type and class definitions utilized by both the server and the judger. Not designed to be used as a standalone package.

### [@argoncs/libraries](https://www.npmjs.com/package/@argoncs/libraries)

Utilities and libraries used by both the server and the judger to interact with the infrastructure (such as DB and Object Storage).

### [@argoncs/configs](https://www.npmjs.com/package/@argoncs/configs)

Configurations shared between the server and the judger.

## Contribution

TeamsCode is a student organization and this project is developed entirely by high school students. We developed this project with the hope that it can benefit the community while serving as TeamsCode's contest server.

While issues and pull requests are always welcomed, the best way to contribute to this project is to join our team. If you are a high school student and knows web development, feel free to email us at contact@teamscode.org for more info!
