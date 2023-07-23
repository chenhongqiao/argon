<template>
  <div>
    <div class="flex pt-0 mt-0 justify-center">
      <div class="flex w-[1200px]">
        <NH1 class="grow">{{ contestData?.name }}</NH1>
      </div>
    </div>
    <div class="flex justify-center">
      <div
        class="grid grid-cols-7 gap-x-12 gap-y-6 justify-center mt-4 w-[1200px] justify-center"
      >
        <div class="col-span-5 flex flex-col">
          <NCard class="grow">
            <NTabs>
              <NTabPane name="overview" tab="Overview">
                {{ contestData?.description }}
              </NTabPane>
              <NTabPane name="problems" disabled tab="Problems"></NTabPane>
              <NTabPane
                name="leaderboard"
                disabled
                tab="Leaderboard"
              ></NTabPane>
            </NTabs>
          </NCard>
        </div>
        <div class="col-span-2 flex flex-col">
          <NCard v-if="contestStatus === 'upcoming'" title="Starting in">
            <n-h1>
              <NCountdown :duration="timerDuration" />
            </n-h1>
            <template #header-extra>
              <n-tag type="info"> Upcoming </n-tag>
            </template>
          </NCard>
          <NCard v-else-if="contestStatus === 'running'" title="Time left">
            <n-h1>
              <NCountdown :duration="timerDuration" />
            </n-h1>
            <template #header-extra>
              <n-tag type="info"> Upcoming </n-tag>
            </template>
          </NCard>
          <div v-if="!userProfile">
            <NCard class="mt-4 grow" title="Sign up">
              <NButton class="w-full" type="primary" disabled>
                Sign in or register first
              </NButton>
            </NCard>
          </div>
          <div v-else-if="teamData && contestData">
            <TeamPanel
              ref="teamRef"
              :team="teamData.profile"
              :members="teamData.members"
              :invitations="teamData.invitations"
              :invitation-profiles="teamData.invitationProfiles"
              :user-id="userProfile.id"
              :max-size="contestData.teamSize"
              @refetch="fetchTeam()"
            />
          </div>
          <div v-else>
            <NCard class="mt-4 grow" title="Sign up">
              <NButton
                class="w-full"
                type="primary"
                :disabled="showTeamCreation"
                @click="showTeamCreation = true"
              >
                Form new team
              </NButton>
            </NCard>
          </div>
        </div>
      </div>
    </div>
    <TeamCreation
      v-if="contestData"
      :contest-id="contestData.id"
      :show="showTeamCreation"
      :team-size="contestData.teamSize"
      @refetch="
        fetchTeam();
        showTeamCreation = false;
      "
    />
  </div>
</template>
<script lang="ts" setup>
import {
  Contest,
  PublicUserProfile,
  Team,
  TeamInvitation,
} from "@argoncs/types";
import { storeToRefs } from "pinia";
import { useUserStore } from "~/stores/user";
const route = useRoute();
const { contest } = route.params as { contest: string };
const { $pinia, $api } = useNuxtApp();
const { profile: userProfile } = storeToRefs(useUserStore($pinia));
const { data: contestData, error: contestError } = await useAPI<Contest>(
  `/contests/${contest}`,
  {
    immediate: true,
    watch: false,
  },
);
if (contestData.value == null) {
  throw createError({
    message: contestError.value?.message,
    statusCode: contestError.value?.statusCode,
  });
}

const currentTime = Date.now();
const contestStatus: Ref<"upcoming" | "running" | "ended" | undefined> =
  ref(undefined);
const timerDuration = ref(0);
if (currentTime < contestData.value.startTime) {
  contestStatus.value = "upcoming";
  timerDuration.value = contestData.value.startTime - currentTime;
} else if (
  currentTime >= contestData.value.startTime &&
  currentTime <= contestData.value.endTime
) {
  contestStatus.value = "running";
  timerDuration.value = contestData.value.endTime - currentTime;
} else {
  contestStatus.value = "ended";
}
console.log(userProfile.value?.teams[contestData.value.id]);
const headers = useRequestHeaders(["cookie"]);
const { data: teamData, execute: fetchTeam } = await useAsyncData(
  `${userProfile.value?.teams[contestData.value.id]} - ${contestData.value.id}`,
  async () => {
    const contestId = contestData.value?.id as string;
    const teamId = userProfile.value?.teams[contestId];
    const team = await $api<Team>(`/contests/${contestId}/teams/${teamId}`);
    console.log(headers);
    const invitations = await $api<TeamInvitation[]>(
      `/contests/${contestId}/teams/${teamId}/invitations`,
      { headers },
    );
    const members = await $api<PublicUserProfile[]>(
      `/contests/${contestId}/teams/${teamId}/members`,
    );

    const invitationProfiles = await Promise.all(
      invitations.map(async (invitation) => {
        return await $api<PublicUserProfile>(
          `/users/${invitation.userId}/profiles/public`,
        );
      }),
    );
    return { profile: team, members, invitations, invitationProfiles };
  },
  {
    immediate: true,
  },
);

const showTeamCreation = ref(false);
</script>
