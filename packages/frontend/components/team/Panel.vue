<template>
  <div>
    <NCard class="mt-4 grow" title="mike4235 fanclub">
      <template #header-extra>
        <n-tag type="success"> Signed Up </n-tag>
      </template>
      <NList>
        <NListItem v-for="member in members" :key="member.id" class="!px-0">
          <div class="flex align-center">
            <NAvatar
              v-if="member.gravatar"
              class="mt-1"
              :src="member.gravatar"
              round
              size="small"
            />
            <NAvatar v-else class="mt-1" round size="small">
              <NIcon><UserIcon /></NIcon>
            </NAvatar>
            <div class="ml-[14px]">
              <n-text v-if="team.captain === member.id" strong
                >{{ member.name
                }}<NIcon class="ml-1 pt-[1px]"><CaptainIcon /></NIcon
              ></n-text>
              <n-text v-else strong>{{ member.name }}</n-text>
              <div>{{ member.username }}</div>
            </div>
          </div>
          <template
            v-if="team.captain === userId && member.id !== userId"
            #suffix
          >
            <div class="flex">
              <n-popconfirm @positive-click="makeCaptain(member.id)">
                <template #trigger>
                  <NButton quaternary circle class="ml-2"
                    ><template #icon>
                      <NIcon><CaptainIcon /></NIcon></template
                  ></NButton>
                </template>
                Are you sure you want to make this user the new captain? You
                will lose all captain privileges.
              </n-popconfirm>
              <n-popconfirm @positive-click="removeMember(member.id)">
                <template #trigger>
                  <NButton quaternary circle class="ml-2"
                    ><template #icon>
                      <NIcon><DeleteIcon /></NIcon></template
                  ></NButton>
                </template>
                Are you sure you want to remove this member? They'll need a new
                invite to return.
              </n-popconfirm>
            </div>
          </template>
        </NListItem>
      </NList>
      <NDivider />
      <NList>
        <NListItem
          v-for="(member, index) in invitationProfiles"
          :key="member.id"
          class="!px-0"
        >
          <div class="flex align-center">
            <NAvatar
              v-if="member.gravatar"
              class="mt-1"
              :src="member.gravatar"
              round
              size="small"
            />
            <NAvatar v-else class="mt-1" round size="small">
              <NIcon><UserIcon /></NIcon>
            </NAvatar>
            <div class="ml-[14px]">
              <n-text strong>{{ member.name }} (pending)</n-text>
              <div>{{ member.username }}</div>
            </div>
          </div>
          <template
            v-if="team.captain === userId && member.id !== userId"
            #suffix
          >
            <div class="flex">
              <n-popconfirm @positive-click="revokeInvitation(index)">
                <template #trigger>
                  <NButton quaternary circle class="ml-2"
                    ><template #icon>
                      <NIcon><DeleteIcon /></NIcon></template
                  ></NButton>
                </template>
                Revoke invitation?
              </n-popconfirm>
            </div>
          </template>
        </NListItem>
      </NList>
      <NButton
        v-if="maxSize - members.length - invitations.length > 0"
        class="w-full mt-2"
        @click="show = true"
        >Invite more members</NButton
      >
    </NCard>
    <NModal v-model:show="show">
      <NCard class="w-[500px]" title="Invite more members" :bordered="false">
        <MemberInvitation
          :contest-id="team.contestId"
          :team-id="team.id"
          :max-new="maxSize - members.length - invitations.length"
          :existing-invitations="invitations.map((i)=>i.userId)"
          @done="$emit('refetch');show=false"
        />
      </NCard>
    </NModal>
  </div>
</template>
<script setup lang="ts">
import { PublicUserProfile, Team, TeamInvitation } from "@argoncs/types";
import {
  UserOutlined as UserIcon,
  MailOutlined as EmailIcon,
  CrownOutlined as CaptainIcon,
  DeleteOutlined as DeleteIcon,
} from "@vicons/antd";
const props = defineProps<{
  team: Team;
  members: PublicUserProfile[];
  invitations: TeamInvitation[];
  invitationProfiles: PublicUserProfile[];
  userId: string;
  maxSize: number;
}>();
const { $api } = useNuxtApp();
const emit = defineEmits(["refetch"]);
async function removeMember(userId: string) {
  await $api(
    `/contests/${props.team.contestId}/teams/${props.team.id}/members/${userId}`,
    {
      method: "delete",
    },
  );
  emit("refetch");
}

async function makeCaptain(userId: string) {
  await $api(
    `/contests/${props.team.contestId}/teams/${props.team.id}/captain`,
    {
      method: "put",
      body: { userId },
    },
  );
}

async function revokeInvitation(index: number) {
  const invitationId = props.invitations[index].id;
  await $api(
    `/contests/${props.team.contestId}/teams/${props.team.id}/invitations/${invitationId}`,
    { method: "delete" },
  );
  emit("refetch");
}

const show = ref(false);
</script>
