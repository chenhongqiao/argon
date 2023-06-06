# What's behind Argon Contest Server

Argon Contest Server is a distributed contest grading system built with TypeScript. Grading machines compile and execute contestants' submissions in a secure sandbox originally developed by IOI organizers. Grading tasks are distributed among all available machines in the cluster through RabbitMQ. All data are persistently stored in a MongoDB replica set while using DragonflyDB as the global cache. Minio stores testcases and compiled binaries.

For contestants, this means that all test cases of a submission can be graded simultaneously, and results will be available in seconds. For TeamsCode organizers, this new system allows us to scale horizontally better and prepare for larger contests in the future. The strong typing nature of TypeScript also improves the code maintainability in the long run.

We'll continue to update this document as the development of the server progresses.
