-- Deshabilitar la verificación de claves foráneas para evitar errores al eliminar las tablas
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS trending_topic;
DROP TABLE IF EXISTS message_reaction;
DROP TABLE IF EXISTS message_attachment;
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS thread;
DROP TABLE IF EXISTS channel_user;
DROP TABLE IF EXISTS user_role;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS server;
DROP TABLE IF EXISTS organization;

SET FOREIGN_KEY_CHECKS = 1;

----------------------------------------------------
-- Creación de la nueva versión de la base de datos
----------------------------------------------------

-- Tabla ORGANIZATION
CREATE TABLE organization (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    created_at DATETIME
);

-- Tabla SERVER
CREATE TABLE server (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id BIGINT NOT NULL UNIQUE,
    organization_id INT NOT NULL,
    name VARCHAR(255),
    description VARCHAR(255),
    created_at DATETIME,
    CONSTRAINT fk_server_organization FOREIGN KEY (organization_id)
      REFERENCES organization(id)
);

-- Tabla USER
CREATE TABLE `user` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id BIGINT NOT NULL UNIQUE,
    server_id INT NOT NULL,
    nick VARCHAR(255),
    name VARCHAR(255),
    joined_at DATETIME COMMENT 'Fecha en la que el usuario entró al servidor',
    CONSTRAINT fk_user_server FOREIGN KEY (server_id)
      REFERENCES server(id)
);

-- Tabla ROLE
CREATE TABLE role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    created_at DATETIME
);

-- Tabla USER_ROLE
CREATE TABLE user_role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at DATETIME,
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id)
      REFERENCES `user`(id),
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id)
      REFERENCES role(id)
);

-- Tabla CHANNEL
CREATE TABLE channel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id BIGINT NOT NULL UNIQUE,
    server_id INT NOT NULL,
    name VARCHAR(255),
    channel_type VARCHAR(50) COMMENT 'Ejemplo: ''text'' o ''forum''',
    created_at DATETIME,
    CONSTRAINT fk_channel_server FOREIGN KEY (server_id)
      REFERENCES server(id)
);

-- Tabla CHANNEL_USER
CREATE TABLE channel_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    user_id INT NOT NULL,
    is_featured BOOLEAN,
    joined_at DATETIME,
    CONSTRAINT fk_channel_user_channel FOREIGN KEY (channel_id)
      REFERENCES channel(id),
    CONSTRAINT fk_channel_user_user FOREIGN KEY (user_id)
      REFERENCES `user`(id)
);

-- Tabla THREAD
CREATE TABLE thread (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    discord_id BIGINT NOT NULL UNIQUE,
    title VARCHAR(255),
    description TEXT,
    created_at DATETIME,
    CONSTRAINT fk_thread_channel FOREIGN KEY (channel_id)
      REFERENCES channel(id)
);

-- Tabla MESSAGE
CREATE TABLE message (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discord_id BIGINT NOT NULL UNIQUE,
    channel_id INT NOT NULL,
    thread_id INT,
    user_id INT NOT NULL,
    parent_message_id INT,
    content TEXT,
    created_at DATETIME,
    CONSTRAINT fk_message_channel FOREIGN KEY (channel_id)
      REFERENCES channel(id),
    CONSTRAINT fk_message_thread FOREIGN KEY (thread_id)
      REFERENCES thread(id),
    CONSTRAINT fk_message_user FOREIGN KEY (user_id)
      REFERENCES `user`(id),
    CONSTRAINT fk_message_parent FOREIGN KEY (parent_message_id)
      REFERENCES message(id)
);

-- Tabla MESSAGE_ATTACHMENT
CREATE TABLE message_attachment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    attachment_url TEXT,
    created_at DATETIME,
    CONSTRAINT fk_message_attachment_message FOREIGN KEY (message_id)
      REFERENCES message(id)
);

-- Tabla MESSAGE_REACTION
CREATE TABLE message_reaction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    reaction_type VARCHAR(50) COMMENT 'Por ejemplo, ''like'', ''love'', ''smile'', etc.',
    created_at DATETIME,
    CONSTRAINT fk_message_reaction_message FOREIGN KEY (message_id)
      REFERENCES message(id),
    CONSTRAINT fk_message_reaction_user FOREIGN KEY (user_id)
      REFERENCES `user`(id)
);

-- Tabla TRENDING_TOPIC
CREATE TABLE trending_topic (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id INT NOT NULL,
    description VARCHAR(255),
    created_at DATETIME,
    CONSTRAINT fk_trending_topic_channel FOREIGN KEY (channel_id)
      REFERENCES channel(id)
);
