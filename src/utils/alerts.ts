import Swal, { type SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const swalDark: SweetAlertOptions = {
    background: "#1A1A1A",
    color: "#F2F0E6",
    confirmButtonColor: "#FF5722",
    cancelButtonColor: "rgba(255, 255, 255, 0.1)",
    customClass: {
        popup: 'swal2-dark-popup',
        confirmButton: 'swal2-dark-confirm',
        cancelButton: 'swal2-dark-cancel',
    }
};

export const showAlert = (options: SweetAlertOptions) => {
    return Swal.fire({
        ...swalDark,
        ...options,
    } as SweetAlertOptions);
};

export const showSuccessToast = (title: string, text?: string, timer: number = 3000) => {
    return Swal.fire({
        ...swalDark,
        icon: "success",
        title: title,
        text: text,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: timer,
    });
};

export const showError = (title: string, text?: string) => {
    return Swal.fire({
        ...swalDark,
        icon: "error",
        title: title,
        text: text,
    });
};

export const showConfirm = (
    title: string,
    text: string,
    confirmText: string = "Sí",
    cancelText: string = "Cancelar"
) => {
    return Swal.fire({
        ...swalDark,
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: false,
        focusCancel: true,
    });
};

export const showLoading = (title: string) => {
    return Swal.fire({
        ...swalDark,
        title,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};
