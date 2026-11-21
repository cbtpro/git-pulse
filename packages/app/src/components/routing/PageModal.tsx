import { Modal, type ModalProps } from "@arco-design/web-react";
import type { PropsWithChildren } from "react";
import { usePageActive } from "./PageState";

/** Hide inactive-page dialogs without resetting their drafts or trapping focus. */
export function PageModal(props: PropsWithChildren<ModalProps>) {
  const active = usePageActive();
  return (
    <Modal
      {...props}
      visible={active && props.visible}
      unmountOnExit={active ? props.unmountOnExit : false}
    />
  );
}
