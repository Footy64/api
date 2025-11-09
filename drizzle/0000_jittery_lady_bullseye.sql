CREATE TABLE `users`
(
    `id`            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `email`         text NOT NULL,
    `password_hash` text NOT NULL,
    `display_name`  text,
    `created_at`    integer DEFAULT (unixepoch()
        )                NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);