<template>
  <NModal v-model:show="show">
    <NCard class="w-[500px]" title="Form new team" :bordered="false">
      <NSteps :current="step" :status="status" class="mt-2">
        <NStep title="Create Team" />
        <NStep title="Invite Members" />
      </NSteps>
      <div v-if="step === 1" class="mt-4">
        <NForm ref="teamRef" :rules="teamRules" :model="teamForm">
          <NFormItem label="Team Name" path="name" class="pr-2">
            <NInput
              v-model:value="teamForm.name"
              :maxlength="48"
              placeholder=""
            />
          </NFormItem>
        </NForm>
        <div class="flex">
          <NFormItem label="How did you hear about us?" class="pr-2">
            <NSelect
              v-model:value="source"
              :options="sourceOptions"
              placeholder=""
            />
          </NFormItem>
          <div class="grow"></div>
          <NButton
            class="mr-2 my-auto"
            type="primary"
            :loading="createLoading"
            @click="createTeam"
          >
            Create Team</NButton
          >
        </div>
      </div>
      <div v-if="step === 2" class="mt-4">
        <MemberInvitation
          :contest-id="contestId"
          :team-id="team"
          :max-new="teamSize"
          :existing-invitations="[]"
          @done="$emit('refetch')"
        />
      </div>
    </NCard>
  </NModal>
</template>
<script setup lang="ts">
import { NewTeam } from "@argoncs/types";

import { useUserStore } from "~/stores/user";

const props = defineProps<{
  show: boolean;
  contestId: string;
  teamSize: number;
}>();
const emit = defineEmits(["update:show", "refetch"]);

const show = computed({
  get() {
    return props.show;
  },
  set(value) {
    emit("update:show", value);
  },
});

const step = ref(1);
const status: Ref<"process" | "wait" | "error" | "finish" | undefined> =
  ref("process");

const teamForm = ref({}) as Ref<NewTeam>;
const teamRules = {
  name: [
    {
      required: true,
      message: "Required",
      trigger: "blur",
    },
  ],
};
const teamRef = ref();

const source = ref(null);
const sourceOptions = ref([
  { label: "Discord", value: "Discord" },
  { label: "Friends", value: "Friends" },
  { label: "Google Search", value: "Google Search" },
  { label: "Teachers", value: "Teachers" },
  { label: "Participated Before", value: "Participated Before" },
]);

const createLoading = ref(false);
const { $api } = useNuxtApp();
const { attach } = useUserStore();
const team = ref("");
async function createTeam() {
  try {
    await teamRef.value.validate();
  } catch {
    return;
  }
  try {
    createLoading.value = true;
    const { teamId } = await $api<{ teamId: string }>(
      `/contests/${props.contestId}/teams`,
      {
        method: "post",
        body: teamForm.value,
      },
    );
    await attach();
    team.value = teamId;
    step.value += 1;
  } finally {
    createLoading.value = false;
  }
}
</script>
