const GET_TOP_CHANNEL_QUERY = `
SELECT c.id, c.name, COUNT(m.id) AS message_count
FROM channel c
JOIN message m ON m.fk_channel_id = c.id
WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
GROUP BY c.id, c.name
ORDER BY message_count DESC
LIMIT 1;
`;

const GET_AVG_ACTIVE_USERS_QUERY = `
SELECT AVG(daily_users) AS avg_active_users
FROM (
  SELECT DATE(created_at) AS day, COUNT(DISTINCT fk_user_id) AS daily_users
  FROM message
  GROUP BY DATE(created_at)
) AS daily;
`;

const GET_TOTAL_MESSAGE_COUNT_QUERY = `
SELECT COUNT(*) AS total_message_count
FROM message
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK);
`;

const GET_NEW_MEMBERS_QUERY = `
SELECT COUNT(*) AS new_members
FROM user
WHERE joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
`;

const GET_TOP_USER_QUERY = `
SELECT u.id, u.nick, u.name, COUNT(m.id) AS message_count
FROM user u
JOIN message m ON m.fk_user_id = u.id
WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
GROUP BY u.id, u.nick, u.name
ORDER BY message_count DESC
LIMIT 1;
`;

module.exports = {
  GET_TOP_CHANNEL_QUERY,
  GET_AVG_ACTIVE_USERS_QUERY,
  GET_TOTAL_MESSAGE_COUNT_QUERY,
  GET_NEW_MEMBERS_QUERY,
  GET_TOP_USER_QUERY,
};
