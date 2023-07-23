<template>
  <div>
    <NSelect
      v-model:value="invitations"
      multiple
      :filterable="invitations.length < maxNew"
      :placeholder="`Search with the complete username or first/last name`"
      :options="options"
      :loading="loading"
      clearable
      remote
      :render-label="renderLabel"
      :render-tag="renderMultipleSelectTag"
      :clear-filter-after-select="true"
      @search="handleSearch"
    >
      <template #action> Only users without a team are displayed </template>
    </NSelect>
    <div class="flex">
      <div class="grow"></div>
      <NButton
        v-if="invitations.length > 0"
        class="my-auto mt-4"
        type="primary"
        :loading="loading"
        @click="inviteMembers"
      >
        Invite Members
      </NButton>
      <NButton
        v-else
        class="my-auto mt-4"
        type="primary"
        @click="$emit('done')"
      >
        Done
      </NButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  UserOutlined as UserIcon,
  MailOutlined as EmailIcon,
} from "@vicons/antd";
import {
  SelectRenderLabel,
  SelectRenderTag,
  NAvatar,
  NText,
  NTag,
  NIcon,
} from "naive-ui";
import { useDebounceFn } from "@vueuse/core";
import { PublicUserProfile } from "@argoncs/types";
const props = defineProps<{
  contestId: string;
  teamId: string;
  maxNew: number;
  existingInvitations: string[];
}>();
const emit = defineEmits(["done"]);
const { $api } = useNuxtApp();
const loading = ref(false);
const options = ref([]) as Ref<
  { label: string; value: string; gravatar?: string; name: string }[]
>;
const invitations = ref([]);

const handleSearch = useDebounceFn(async (query: string) => {
  if (query === "") {
    options.value = [];
  } else if (query.includes("@")) {
    options.value = [{ value: query, label: query, name: query }];
  } else {
    try {
      loading.value = true;
      const match = await $api<PublicUserProfile[]>("/users", {
        query: { query, noteam: props.contestId },
      });
      console.log(props.existingInvitations)
      console.log(match)
      options.value = match.filter(user=>!props.existingInvitations.includes(user.id)).map((user) => {
        return {
          label: user.username,
          value: user.id,
          name: user.name,
          gravatar: user.gravatar,
        };
      });
    } finally {
      loading.value = false;
    }
  }
}, 200);

async function inviteMembers() {
  try {
    loading.value = true;
    const queue: any[] = [];
    invitations.value.forEach((userId) => {
      queue.push(
        $api(`/contests/${props.contestId}/teams/${props.teamId}/invitations`, {
          method: "post",
          body: { userId },
        }),
      );
    });
    await Promise.all(queue);
  } finally {
    loading.value = false;
  }
  emit("done");
}

const renderMultipleSelectTag: SelectRenderTag = ({ option, handleClose }) => {
  const avatar = String(option.value).includes("@")
    ? h(
        NAvatar,
        {
          round: true,
          size: 22,
          style: {
            marginRight: "4px",
          },
        },
        h(NIcon, {
          component: EmailIcon,
          style: {
            marginBottom: "1.5px",
          },
        }),
      )
    : option.gravatar
    ? h(NAvatar, {
        src: option.gravatar as string,
        round: true,
        size: 22,
        style: {
          marginRight: "4px",
        },
      })
    : h(
        NAvatar,
        {
          round: true,
          size: 22,
          style: {
            marginRight: "4px",
          },
        },
        h(NIcon, { component: UserIcon }),
      );
  return h(
    NTag,
    {
      style: {
        padding: "0 6px 0 4px",
      },
      round: true,
      closable: true,
      onClose: (e) => {
        e.stopPropagation();
        handleClose();
      },
    },
    {
      default: () =>
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
            },
          },
          [avatar, option.label as string],
        ),
    },
  );
};
const renderLabel: SelectRenderLabel = (option) => {
  if (String(option.value).includes("@")) {
    return h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
        },
      },
      [
        h(
          NAvatar,
          {
            round: true,
            size: "small",
          },
          h(NIcon, { component: EmailIcon }),
        ),
        h(
          "div",
          {
            style: {
              marginLeft: "12px",
              padding: "4px 0",
            },
          },
          [
            h("div", null, [option.label as string]),
            h(
              NText,
              { depth: 3, tag: "div" },
              {
                default: () => "Send email invitation",
              },
            ),
          ],
        ),
      ],
    );
  } else {
    const avatar = option.gravatar
      ? h(NAvatar, {
          src: option.gravatar as string,
          round: true,
          size: "small",
        })
      : h(
          NAvatar,
          {
            round: true,
            size: "small",
          },
          h(NIcon, { component: UserIcon }),
        );
    return h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
        },
      },
      [
        avatar,
        h(
          "div",
          {
            style: {
              marginLeft: "12px",
              padding: "4px 0",
            },
          },
          [
            h("div", null, [option.name as string]),
            h(
              NText,
              { depth: 3, tag: "div" },
              {
                default: () => option.label as string,
              },
            ),
          ],
        ),
      ],
    );
  }
};
</script>
