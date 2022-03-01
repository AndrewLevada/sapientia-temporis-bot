import { FullUserInfo, UserInfo } from "../src/services/user-service";
import { usersRef } from "./users-query";

// eslint-disable-next-line import/prefer-default-export
export function removeUsersWithoutTypeField(): void {
  usersRef.once("value").then(snap => {
    const users: FullUserInfo[] = Object.entries<UserInfo>(snap.val()).map(v => ({ userId: v[0], ...v[1] }));
    const selectedUserIds: string[] = [];

    for (const user of users)
      if (!user.type) selectedUserIds.push(user.userId);

    console.log(`Selected users: ${selectedUserIds.length}`);
    Promise.all(selectedUserIds.map(id => usersRef.child(id).remove()))
      .then(() => console.log("Removed all"));
  });
}
